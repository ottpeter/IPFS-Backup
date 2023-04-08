// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;


import { MarketAPI } from "@zondax/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import { CommonTypes } from "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import { MarketTypes } from "@zondax/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import { AccountTypes } from "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";
import { CommonTypes } from "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import { AccountCBOR } from "@zondax/filecoin-solidity/contracts/v0.8/cbor/AccountCbor.sol";
import { MarketCBOR } from "@zondax/filecoin-solidity/contracts/v0.8/cbor/MarketCbor.sol";
import { BytesCBOR } from "@zondax/filecoin-solidity/contracts/v0.8/cbor/BytesCbor.sol";
import { BigNumbers } from "@zondax/filecoin-solidity/contracts/v0.8/external/BigNumbers.sol";
import { CBOR } from "@zondax/filecoin-solidity/contracts/v0.8/external/CBOR.sol";
import { Misc } from "@zondax/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import { FilAddresses } from "@zondax/filecoin-solidity/contracts/v0.8/utils/FilAddresses.sol";
import { MarketDealNotifyParams, deserializeMarketDealNotifyParams, serializeDealProposal, deserializeDealProposal } from "./Types.sol";

import "hardhat/console.sol";

using CBOR for CBOR.CBORBuffer;

contract MockMarket {
    function publish_deal(bytes memory raw_auth_params, address callee) public {
        // calls standard filecoin receiver on message authentication api method number
        (bool success, ) = callee.call(abi.encodeWithSignature("handle_filecoin_method(uint64,uint64,bytes)", 0, 2643134072, raw_auth_params));
        require(success, "client contract failed to authorize deal publish");
    }
}




// This is the object that is coming from the backup script, it will contain information that we need to create a Deal Request
struct BackupRequest {
    string name;                                            // Name of the backup, for example 'backup1680088311714'
    bytes pieceCID;                                         // Can be casted to CommonTypes.Cid | CommonTypes.Cid(pieceCID)
    uint64 pieceSize;                                       // Power of 2
    string label;                                           // PayloadCID
    int64 dealDuration;                                     // Deal Duration in epoch
    uint256 maxPricePerEpoch;                               // Max storage price per epoch
    string originalLocation;                                // Original location, from where the data will be downloaded (location ref)
    uint64 carSize;                                         // alias Payload Size
}
 
// For every PieceCID, we will store this collection of data
// It will be a value pair of a commP key
struct BackupItem {
    string name;
    uint16 totalDealCount;
    uint16 atLeast1MonthDealCount;
    uint16 targetRedundancy;
    uint64 pieceSize;
    string label;
    int64 dealDuration;
    uint256 maxPricePerEpoch;
    string originalLocation;
    uint64 carSize;
    uint64 dealArrayId;
}

// A single deal about a BackupItem
struct BackupItemDeal {
    uint64 dealId;
    bytes providerAddress;
    int64 startEpoch;
    int64 endEpoch;
    MarketTypes.GetDealActivationReturn status;
    bool isActive;
}

struct ExtraParamsV1 {
    string location_ref;
    uint64 car_size;
    bool skip_ipni_announce;
    bool remove_unsealed_copy;
}

// A pair of backup name and associated commP
struct NameEntry {
    string name;
    bytes commP;
}

function serializeExtraParamsV1(
    ExtraParamsV1 memory params
) pure returns (bytes memory) {
    CBOR.CBORBuffer memory buf = CBOR.create(64);
    buf.startFixedArray(4);
    buf.writeString(params.location_ref);
    buf.writeUInt64(params.car_size);
    buf.writeBool(params.skip_ipni_announce);
    buf.writeBool(params.remove_unsealed_copy);
    return buf.data();
}

contract DealClient {
    using AccountCBOR for *;
    using MarketCBOR for *;

    uint64 constant public AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 constant public DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 constant public MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    int64 constant public ONE_MONTH = 86400;                                // Approximately 1 month in epochs

    mapping(bytes32 => bytes) public dealProposals;                         // We will have this instead of dealProposals. uniqId -> commP
    mapping(bytes => BackupItem) public backupItems;                        // commP -> BackupItem - this is the one that we will keep on the long run
    mapping(uint64 => BackupItemDeal[]) public dealArrays;                  // dealArrayId -> BackupItemDeal[]
    NameEntry[] nameLookupArray;                                            // Will help to get commP based on backup name
    uint64 dealArrayNonce = 0;                                              // Will be used as identifier for dealArrays
    uint64 nameLookupArrayNonce = 0;                                        // Index of next nameLookupArray[index]
    uint16 defaultTargetRedundancy = 2;                                     // Default target redundancy, that will be copied to every BackupItem, if other value not specified

    event ReceivedDataCap(string received);
    event DealProposalCreate(bytes32 indexed id, uint64 size, bool indexed verified, uint256 price);

    event Log(string text);
    event UniqId(bytes32 id);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function removeDeal(uint64 arrayId, uint64 index) internal returns (bool) {
        if (index >= dealArrays[arrayId].length) return false;

        for (uint64 i = index; i < dealArrays[arrayId].length-1;i++) {
            dealArrays[arrayId][i] = dealArrays[arrayId][i+1];
        }
        dealArrays[arrayId].pop();

        return true;
    }

    // Start the backup proccess, an entry should be created in 'backupItems' after this
    // Another function will bring up the BackupItem to target redundancy if this does not succeed at first
    function startBackup(BackupRequest calldata backupMeta) public returns (bool) {
        require (msg.sender == owner);
        // will need to do a DUPLICATE require, but we are not doing it yet for convenience in testing

        // Initialize new backup entry        
        backupItems[backupMeta.pieceCID] = BackupItem({
            name: backupMeta.name,
            totalDealCount: 0,
            atLeast1MonthDealCount: 0,
            targetRedundancy: defaultTargetRedundancy,
            pieceSize: backupMeta.pieceSize,
            label: backupMeta.label,
            dealDuration: backupMeta.dealDuration,
            maxPricePerEpoch: backupMeta.maxPricePerEpoch,
            originalLocation: backupMeta.originalLocation,
            carSize: backupMeta.carSize,
            dealArrayId: dealArrayNonce
        });
        dealArrayNonce = dealArrayNonce + 1;

        nameLookupArray.push(NameEntry({
            name: backupMeta.name,
            commP: backupMeta.pieceCID
        }));
        nameLookupArrayNonce = nameLookupArrayNonce + 1;

        uint64 index = backupItems[backupMeta.pieceCID].dealArrayId;
        // We make as many deals, as target redundancy
        for (uint16 i = 0; i < backupItems[backupMeta.pieceCID].targetRedundancy; i++) {
            bytes32 uniqId = keccak256(abi.encodePacked(block.timestamp, msg.sender, backupMeta.pieceCID, i));
            emit UniqId(uniqId);
            
            dealProposals[uniqId] = backupMeta.pieceCID;                      // uniqID -> commP

            emit DealProposalCreate(                                          // Writes the proposal metadata to the event log
                uniqId,
                backupMeta.pieceSize,
                false,                                                        // Not verified
                0                                                             // Initially price is 0
            );
        }

        return true;
    }

    function getBackupItem(bytes memory commP) public view returns (BackupItem memory) {
        return backupItems[commP];
    }

    function getDeals(bytes memory commP) public view returns (BackupItemDeal[] memory) {
        uint64 index = backupItems[commP].dealArrayId;
        return dealArrays[index];
    }

    function refreshMetadataForBackupItem(bytes memory commP) public returns (bool) {
        uint64 dealArrayIndex = backupItems[commP].dealArrayId;
        uint16 newDealCount = 0;
        uint16 new1MonthPlusCount = 0;

        for (uint16 i = 0; i < dealArrays[dealArrayIndex].length; i++) {
            uint64 dealId = dealArrays[dealArrayIndex][i].dealId;
            /*try MarketAPI.getDealActivation(dealId) returns (MarketTypes.GetDealActivationReturn memory result) {
                dealArrays[dealArrayIndex][i].status = result;
            } catch {
                // deal expired. If other error and deal is actually active, that would be a problem.
                bool success = removeDeal(dealArrayIndex, i);
                require(success, "There was an error while removing expired deal from the array");
                continue;
            }*/
            // Will run into errors, smart contract will revert if EX_DEAL_EXPIRED. But it will compile.
            dealArrays[dealArrayIndex][i].status = MarketAPI.getDealActivation(dealId);

            if (dealArrays[dealArrayIndex][i].status.activated > 0 && dealArrays[dealArrayIndex][i].status.terminated < 1) {
                newDealCount++;
                dealArrays[dealArrayIndex][i].isActive = true;
                if (dealArrays[dealArrayIndex][i].endEpoch + ONE_MONTH > int64(uint64(block.number))) new1MonthPlusCount++;
            }
            if (dealArrays[dealArrayIndex][i].status.terminated > 0) {
                bool success = removeDeal(dealArrayIndex, i);
                require(success, "There was an error while removing expired deal from the array");
            }
        }
        backupItems[commP].totalDealCount = newDealCount;
        backupItems[commP].atLeast1MonthDealCount = new1MonthPlusCount;

        return true;
    }

    function refreshMetadataForAll() public returns (bool) {
        for (uint64 i = 0; i < nameLookupArray.length; i++) {
            refreshMetadataForBackupItem(nameLookupArray[i].commP);
        }
        return true;
    }

    // Refresh metadata for specific BackupItems (list of commP)
    function refreshMetadataForList(bytes[] memory list) public returns (bool) {
        for (uint64 i = 0; i < list.length; i++) {
            refreshMetadataForBackupItem(list[i]);
        }
        return true;
    }

    // View function for the nameLookupArray
    function getNameLookupArraySegment(uint64 from, uint64 count) public view returns (NameEntry[] memory) {    
        NameEntry[] memory result = new NameEntry[](count);
        if (nameLookupArray.length == 0) return result;
        require(from < nameLookupArray.length, "from value can't be larger than or equal to the size of the array");
        
        if (from+count > uint64(nameLookupArray.length)) count = uint64(nameLookupArray.length);

        uint64 index = 0;

        for (uint64 i = from; i < from+count; i++) {
            result[index] = nameLookupArray[i];
            index++;
        }

        return result;
    }

    // Get the name of the backup with commP
    function getNameForCommp(bytes memory commP) public view returns (string memory) {
        return backupItems[commP].name;
    }

    function keepTargetRedundancy(bytes memory commP) public returns (bool) {
        uint64 index = backupItems[commP].dealArrayId;
        // We bring up atLeast1Month to target redundancy
        for (uint16 i = backupItems[commP].atLeast1MonthDealCount; i < backupItems[commP].targetRedundancy; i++) {
            bytes32 uniqId = keccak256(abi.encodePacked(block.timestamp, msg.sender, commP, i));
            emit UniqId(uniqId);
            
            dealProposals[uniqId] = commP;

            emit DealProposalCreate(                                          // Writes the proposal metadata to the event log
                uniqId,
                backupItems[commP].pieceSize,
                false,                                                        // Not verified
                0                                                             // Initially price is 0
            );
        }
        return true;
        // problem is with location, original location might not exist anymore
    }

    // Returns a CBOR-encoded DealProposal.
    function getDealProposal(bytes32 proposalId) view public returns (bytes memory) {
        bytes memory commP = dealProposals[proposalId];                                 // Get PieceCID based on uniqId

        int64 epochFromNow = 600;     // we will need to find a good number here                                                 // Deal will be activated this many epoch from now
        int64 startEpoch = int64(int256(block.number)) + epochFromNow;
        int64 endEpoch = startEpoch + backupItems[commP].dealDuration;

        MarketTypes.DealProposal memory ret;                                            // Create DealProposal object
        ret.piece_cid = CommonTypes.Cid(commP);                                         // Piece CID
        ret.piece_size = backupItems[commP].pieceSize;                                  // Piece Size
        ret.verified_deal = false;                                                      // Deal is not verified
        ret.client = getDelegatedAddress(address(this));                                // This will be the address of the contract        
        ret.provider = FilAddresses.fromActorID(0);                                     // Set a dummy provider. The provider that picks up this deal will need to set its own address.
        ret.label = backupItems[commP].label;                                           // Payload CID
        ret.start_epoch = startEpoch;                                                   // Start epoch
        ret.end_epoch = endEpoch;                                                       // End epoch
        ret.storage_price_per_epoch = uintToBigInt(0);                                  // We need to solve this, we have max value instead of a concrete value
        ret.provider_collateral = uintToBigInt(0);                                      // Most likely this will be always 0
        ret.client_collateral = uintToBigInt(0);                                        // Most likely this will be always 0

        return serializeDealProposal(ret);
    }

    function getExtraParams(bytes32 proposalId) public view returns (bytes memory extra_params) {        
        bytes memory commP = dealProposals[proposalId];                                 // Get PieceCID based on uniqId
        ExtraParamsV1 memory extraParams= ExtraParamsV1({
            location_ref: backupItems[commP].originalLocation,
            car_size: backupItems[commP].carSize,
            skip_ipni_announce: false,
            remove_unsealed_copy: false
        });
        return serializeExtraParamsV1(extraParams);
    }

    // We needed this to test something, probably we will delete it later
    function getCommpFromId(bytes32 proposalId) view public returns (bytes memory) {
        bytes memory commP = dealProposals[proposalId];                                 // Get PieceCID based on uniqId
        return commP;
    }

    function getDefaultTargetRedundancy() public view returns (uint16) {
        return defaultTargetRedundancy;
    }

    function changeDefaultTargetRedundancy(uint16 newValue) public returns (bool) {
        defaultTargetRedundancy = newValue;
        return true;
    }

    function changeTargetRedundancy(bytes memory commP, uint16 newValue) public returns (bool) {
        if (backupItems[commP].pieceSize == 0) return false;
        backupItems[commP].targetRedundancy = newValue;
        return true;
    }

    // TODO fix in filecoin-solidity. They're using the wrong hex value.
    function getDelegatedAddress(address addr) internal pure returns (CommonTypes.FilAddress memory) {
        return CommonTypes.FilAddress(abi.encodePacked(hex"040a", addr));
    }


    function authenticateMessage(bytes memory params) view internal {
        AccountTypes.AuthenticateMessageParams memory amp = params.deserializeAuthenticateMessageParams();
        MarketTypes.DealProposal memory proposal = deserializeDealProposal(amp.message);

        require(backupItems[proposal.piece_cid.data].targetRedundancy > 0, "CommP must exist in backupItems!");                         // We could turn off the backup by setting redundancy to 0
        //require(!pieceProviders[proposal.piece_cid.data].valid, "deal failed policy check: provider already claimed this cid");
    }

    function dealNotify(bytes memory params) internal {
        MarketDealNotifyParams memory mdnp = deserializeMarketDealNotifyParams(params);
        MarketTypes.DealProposal memory proposal = deserializeDealProposal(mdnp.dealProposal);

        require(backupItems[proposal.piece_cid.data].targetRedundancy > 0, "CommP must exist in backupItems!");                         // We could turn off the backup by setting redundancy to 0
        bool providerAlreadyStoringThisData = false;
        BackupItemDeal[] memory arr = dealArrays[backupItems[proposal.piece_cid.data].dealArrayId];
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i].dealId == mdnp.dealId) { // couldn't compare providerAddress because of some Solidity error (can not compary bytes to bytes)
                providerAlreadyStoringThisData = true;
                break;
            }
        }
        require(!providerAlreadyStoringThisData, "Provider is already storing this data");                                              // We don't want duplicates, has to be stored on different miner
    
        
        dealArrays[backupItems[proposal.piece_cid.data].dealArrayId].push(BackupItemDeal({
            dealId: mdnp.dealId,
            providerAddress: proposal.provider.data,
            startEpoch: proposal.start_epoch,
            endEpoch: proposal.end_epoch,
            status: MarketTypes.GetDealActivationReturn({
                activated: -1,                  // Epoch at which the deal was activated, or -1.
                terminated: -1                  // Epoch at which the deal was terminated abnormally, or -1.
            }),
            isActive: false
        }));
    }

    // client - filecoin address byte format
    function addBalance(CommonTypes.FilAddress memory client, uint256 value) public {
        require(msg.sender == owner);

        // TODO:: remove first arg
        // change to ethAddr -> actorId and use that in the below API

        MarketAPI.addBalance(client, value);
    }

    // Below 2 funcs need to go to filecoin.sol
    function uintToBigInt(uint256 value) internal view returns(CommonTypes.BigInt memory) {
        BigNumbers.BigNumber memory bigNumVal = BigNumbers.init(value, false);
        CommonTypes.BigInt memory bigIntVal = CommonTypes.BigInt(bigNumVal.val, bigNumVal.neg);
        return bigIntVal;
    }

    function bigIntToUint(CommonTypes.BigInt memory bigInt) internal view returns (uint256) {
        BigNumbers.BigNumber memory bigNumUint = BigNumbers.init(bigInt.val, bigInt.neg);
        uint256 bigNumExtractedUint = uint256(bytes32(bigNumUint.val));
        return bigNumExtractedUint;
    }


    function withdrawBalance(CommonTypes.FilAddress memory client, uint256 value) public returns(uint) {
        // TODO:: remove first arg
        // change to ethAddr -> actorId and use that in the below API

        require(msg.sender == owner);

        MarketTypes.WithdrawBalanceParams memory params = MarketTypes.WithdrawBalanceParams(client, uintToBigInt(value));
        CommonTypes.BigInt memory ret = MarketAPI.withdrawBalance(params);

        return bigIntToUint(ret);
    }

    function receiveDataCap(bytes memory params) internal {
        emit ReceivedDataCap("DataCap Received!");
        // Add get datacap balance api and store datacap amount
    }

    function handle_filecoin_method(
        uint64 method,
        uint64,
        bytes memory params
    )
        public
        returns (
            uint32,
            uint64,
            bytes memory
        )
    {
        bytes memory ret;
        uint64 codec;
        // dispatch methods
        if (method == AUTHENTICATE_MESSAGE_METHOD_NUM) {
            authenticateMessage(params);
            // If we haven't reverted, we should return a CBOR true to indicate that verification passed.
            CBOR.CBORBuffer memory buf = CBOR.create(1);
            buf.writeBool(true);
            ret = buf.data();
            codec = Misc.CBOR_CODEC;
        } else if (method == MARKET_NOTIFY_DEAL_METHOD_NUM) {
            dealNotify(params);
        } else if (method == DATACAP_RECEIVER_HOOK_METHOD_NUM) {
            receiveDataCap(params);
        } else {
            revert("the filecoin method that was called is not handled");
        }
        return (0, codec, ret);
    }
}

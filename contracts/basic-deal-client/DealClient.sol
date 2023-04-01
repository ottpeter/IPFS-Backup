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

struct ProposalIdSet {
    bytes32 proposalId;
    bool valid;
}

struct ProposalIdx {
    uint256 idx;
    bool valid;
}

struct ProviderSet {
    bytes provider;
    bool valid;
}



// This is the object that is coming from the backup script, it will contain information that we need to create a Deal Request
struct BackupRequest {
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
    bool isActivated;
}

contract DealClient {
    using AccountCBOR for *;
    using MarketCBOR for *;

    uint64 constant public AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 constant public DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 constant public MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;

    mapping(bytes32 => ProposalIdx) public dealProposals;                   // contract deal id -> deal index (we will delete this later)
    mapping(bytes32 => bytes) public proposals;                             // We will have this instead of dealProposals. uniqId -> commP
    mapping(bytes => ProposalIdSet) public pieceToProposal;                 // commP -> dealProposalID (most likely we will delete this)
    mapping(bytes => ProviderSet) public pieceProviders;                    // commP -> provider (most likely we will delete this)
    mapping(bytes => uint64) public pieceDeals;                             // commP -> deal ID (most likely we will delete this)
    mapping(bytes => BackupItem) public backupItems;                        // commP -> BackupItem - this is the one that we will keep on the long run

    uint64 dealArrayNonce = 0;
    mapping(uint64 => BackupItemDeal[]) public dealArrays;                   // dealArrayId -> BackupItemDeal[]


    uint16 defaultTargetRedundancy = 2;                                     // Default target redundancy, that will be copied to every BackupItem, if other value not specified

    event ReceivedDataCap(string received);
    event DealProposalCreate(bytes32 indexed id, uint64 size, bool indexed verified, uint256 price);

    address public owner;

    constructor() {
        owner = msg.sender;
    }

 

    // Start the backup proccess, an entry should be created in 'backupItems' after this
    // Another function will bring up the BackupItem to target redundancy if this does not succeed at first
    function startBackup(BackupRequest calldata backupMeta) public returns (bool) {
        require (msg.sender == owner);

        // Initialize new backup entry        
        backupItems[backupMeta.pieceCID] = BackupItem({
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
        // is the dealArray ready to be used ?
        dealArrayNonce = dealArrayNonce + 1;

        // We make as many deals, as target redundancy
        for (uint16 i = 0; i < backupItems[backupMeta.pieceCID].targetRedundancy; i++) {
            bytes32 uniqId = keccak256(abi.encodePacked(block.timestamp, msg.sender, backupMeta.pieceCID, i));
            
            proposals[uniqId] = backupMeta.pieceCID;                          // uniqID -> commP
            //dealProposals[uniqId] = ProposalIdx(index, true);               // I think we don't want to do this
            //pieceToProposal[deal.piece_cid] = ProposalIdSet(uniqId, true);  // 1 pieceCID has multiple proposals

            // Writes the proposal metadata tothe event log
            emit DealProposalCreate(
                uniqId,
                backupItems[backupMeta.pieceCID].pieceSize,
                false,                                                        // Not verified
                0                                                             // Initially price is 0
            );
        }

        // first we only need to emit DealProposalCreate, most of the necesarry data, that the callback function will need, will be in BackupItem
        // we will need to rewrite the callback function, accordingly 

        // return success;
    }

    function refreshMetadataForBackupItem() public {}

    function refreshMetadataForAll() public {
        // will need an array for this, can not iterate 'backupItems' mapping
    }

    function keepTargetRedundancy() public {}

    // Returns a CBOR-encoded DealProposal.
    function getDealProposal(bytes32 proposalId) view public returns (bytes memory) {
        bytes memory commP = proposals[proposalId];                                     // Get PieceCID based on uniqId

        int64 epochFromNow = 2000;                                                      // Deal will be activated this many epoch from now
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

    function getDealId(bytes calldata commP) public view returns (uint64) {
        return pieceDeals[commP];
    }

    function getDefaultTargetRedundancy() public view returns (uint16) {
        return defaultTargetRedundancy;
    }

    function changeDefaultTargetRedundancy(uint16 newValue) public {
        defaultTargetRedundancy = newValue;
    }

    // TODO fix in filecoin-solidity. They're using the wrong hex value.
    function getDelegatedAddress(address addr) internal pure returns (CommonTypes.FilAddress memory) {
        return CommonTypes.FilAddress(abi.encodePacked(hex"040a", addr));
    }




    function authenticateMessage(bytes memory params) view internal {
        AccountTypes.AuthenticateMessageParams memory amp = params.deserializeAuthenticateMessageParams();
        MarketTypes.DealProposal memory proposal = deserializeDealProposal(amp.message);

        require(pieceToProposal[proposal.piece_cid.data].valid, "piece cid must be added before authorizing");
        require(!pieceProviders[proposal.piece_cid.data].valid, "deal failed policy check: provider already claimed this cid");
    }

    function dealNotify(bytes memory params) internal {
        MarketDealNotifyParams memory mdnp = deserializeMarketDealNotifyParams(params);
        MarketTypes.DealProposal memory proposal = deserializeDealProposal(mdnp.dealProposal);
    // TODO
        require(pieceToProposal[proposal.piece_cid.data].valid, "piece cid must be added before authorizing");
        require(!pieceProviders[proposal.piece_cid.data].valid, "deal failed policy check: provider already claimed this cid");

        pieceProviders[proposal.piece_cid.data] = ProviderSet(proposal.provider.data, true);
        pieceDeals[proposal.piece_cid.data] = mdnp.dealId;
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

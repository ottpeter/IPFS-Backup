import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CID from 'cids';
import contractObj from "./DealClient.json"
import { network } from './network';
import { useParams } from 'react-router-dom';

export default function BackupDetails() {
  const backupRegEx = /backup([0-9]{13,14})/;
  const folderRegEx = /folder([0-9]{13,14})/;
  const incRegEx = /inc([0-9]{13,14})/;

  let RegEx = /[0-9]{13,14}/;

  const { commP } = useParams();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(null);
  const [type, setType] = useState("");
  const [totalDealCount, setTotalDealCount] = useState(0);
  const [atLeastMonth, setAtLeastMonth] = useState(0);
  const [targetRedundancy, setTargetRedundancy] = useState(0);
  const [pieceSize, setPieceSize] = useState(0);
  const [payloadCID, setPayloadCID] = useState("");
  const [dealDuration, setDealDuration] = useState(0);
  const [maxPricePerEpoch, setMaxPricePerEpoch] = useState(0);
  const [originalLocation, setOriginalLocation] = useState("");
  const [carSize, setCarSize] = useState(0);
  const [dealArrayId, setDealArrayId] = useState(0);
  const [deals, setDeals] = useState([]);

  const networkId = network.defaultNetwork;
  const contractAddr = network.contract;
  const provider = new ethers.BrowserProvider(window.ethereum)
  const commPasBytes = new CID(commP).bytes;
  console.log(`Getting BackupItem for ${commP} on network ${networkId}`);

  
  useEffect(() => {
    
    
    async function loadBackupItem() {
      await provider.send("eth_requestAccounts", []);                                                   // MetaMask requires requesting permission to connect users accounts
      console.log("The block number", (await provider.getBlockNumber()));
      const balanceOfContract = await provider.getBalance(contractAddr);

      const converted = Number.parseInt(balanceOfContract.toString());
      console.log("Balance of contract: ", converted);
      
      const dealClient = new ethers.Contract(contractAddr, contractObj.abi, provider);                  // Contract Instance
      const backupItem = await dealClient.getBackupItem(commPasBytes);                                  // Smart contract call (view)
      
      

      const name = backupItem[0].toString();
      
      // We don't know which one it is.
      // We need to find out, then do it accordingly
      
      let match = backupRegEx.exec(name);
      console.log(match);
      if (match.length > 0) {
        setType("full");
      } else {
        match = folderRegEx.exec(name);
        if (match.length > 0) {
          setType("folder");
        } else {
          match = incRegEx.exec(name);
          if (match.length > 0) {
            setType("incremental");
          }
        }
      }

      const dateString = match ? match[1] : '';
      const timestamp = Number.parseInt(dateString);
      const time = new Date(timestamp);
      setDate(time)

      
      setTotalDealCount(Number.parseInt(backupItem[1].toString()));
      setAtLeastMonth(Number.parseInt(backupItem[2].toString()));
      setTargetRedundancy(Number.parseInt(backupItem[3].toString()));
      setPieceSize(Number.parseInt(backupItem[4].toString()));
      setPayloadCID(backupItem[5]);
      setDealDuration(Number.parseInt(backupItem[6].toString()));
      setMaxPricePerEpoch(Number.parseInt(backupItem[7].toString()));
      setOriginalLocation(backupItem[8]);
      setCarSize(Number.parseInt(backupItem[9].toString()))
      setDealArrayId(Number.parseInt(backupItem[10].toString()));

      const fetchedDeals = await dealClient.getDeals(commPasBytes);

      const processedDeals = fetchedDeals.map((dealItem) => {
        return {
          dealId: Number.parseInt(dealItem[0].toString()),
          providerAddress: dealItem[1],
          startEpoch: Number.parseInt(dealItem[2].toString()),
          endEpoch: Number.parseInt(dealItem[3].toString()),
          status: {
            activated: Number.parseInt(dealItem[4][0].toString()),
            terminated: Number.parseInt(dealItem[4][1].toString())
          },
          isActive: dealItem[5]
        }
      });

      setDeals(processedDeals)
      console.log("Fetched Deals: ", fetchedDeals);
      console.log("backupItem: ", backupItem  );
      setLoading(false);
    }
    loadBackupItem();
  }, [])

  async function refreshMetadata() {
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner()
    const dealClient = new ethers.Contract(contractAddr, contractObj.abi, signer);
    const result = await dealClient.refreshMetadataForBackupItem(commPasBytes);
  }

  return (
    <main id="backupDetails">
      <h1>Full backup of the IPFS repository, made at {date}</h1>
      <h2>
        <button onClick={refreshMetadata}>{"Refresh Metadata"}</button>
      </h2>

      {loading && <div className="loading">
        {"Loading ..."}
      </div>}

      <section id="detailsCard">
        <div className="infoElement">
          <p className="label">{"Total Deal Count: "}</p>
          <p className="value">{totalDealCount}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Deals that are valid for more than a month:"}</p>
          <p className="value">{atLeastMonth}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Target Redundancy: "}</p>
          <p className="value">{targetRedundancy}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Piece CID: "}</p>
          <p className="value">{commP}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Piece Size: "}</p>
          <p className="value">{pieceSize}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Original deal duration: "}</p>
          <p className="value">{dealDuration}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Max price per epoch: "}</p>
          <p className="value">{maxPricePerEpoch}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Original Location: "}</p>
          <p className="value">{originalLocation}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Payload CID: "}</p>
          <p className="value">{payloadCID}</p>
        </div>
        <div className="infoElement">
          <p className="label">{"Payload Size: "}</p>
          <p className="value">{carSize}</p>
        </div>
        {/*<div className="infoElement">
          <p className="label">{"Deal Array ID: "}</p>
          <p className="value">{dealArrayId}</p>
        </div>*/}
        <div className="infoElement">
          <p className="label">{"Deals:"}</p>
          <p className="value">{null}</p>
        </div>
        <div className="infoElement">
          <ul className="dealList">
            {deals.map((deal) => {
              console.log("This is the deal display function.")

              return (
                <li className="dealElement" key={deal.dealId}>
                  <div className="infoElement">
                    <p className="label">{"Deal ID:"}</p>
                    <p className="value">{deal.dealId}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Provider Address:"}</p>
                    <p className="value">{deal.providerAddress}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Start Epoch:"}</p>
                    <p className="value">{deal.startEpoch}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"End Epoch:"}</p>
                    <p className="value">{deal.endEpoch}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Activated:"}</p>
                    <p className="value">{deal.status.activated}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Terminated:"}</p>
                    <p className="value">{deal.status.terminated}</p>
                  </div>
                  <div className="infoElement">
                    <p className="label">{"Active:"}</p>
                    <p className="value">{deal.isActive.toString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>  
      </section>
    </main>
  )
}

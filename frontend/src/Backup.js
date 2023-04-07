import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CID from 'cids';
import contractObj from "./DealClient.json"
import { network } from './network';

const BASE_URL = process.env.REACT_APP_BASE_URL;
const START_URL = `http://${BASE_URL}:3000/backup/start`;
const UPDATE_URL = `http://${BASE_URL}:3000/backup/show-inprogress`;
const FIRST_UPDATE_INTERVAL = 1500;         // ms
const SECOND_UPDATE_INTERVAL = 20000;       // ms

export default function Backup() {
  const networkId = network.defaultNetwork;
  const contractAddr = network.contract;
  const provider = new ethers.BrowserProvider(window.ethereum);


  
  let clock = null;
  //const [theInterval, setTheInterval] = useState(null);
  const [backupName, setBackupName] = useState("");
  const [fillArrayReady, setFillArrayReady] = useState(false);
  const [copyToMFSReady, setCopyToMFSReady] = useState(false);
  const [carExportPercent, setCarExportPercent] = useState(null);
  const [carExportReady, setCarExportReady] = useState(false);
  const [commPCalculationReady, setCommPCalculationReady] = useState(false);
  const [payloadCID, setPayloadCID] = useState("");
  const [commP, setCommP] = useState("");
  const [pieceSize, setPieceSize] = useState(null);
  const [payloadSize, setPayloadSize] = useState(null);
  const [cumulativeSize, setCumulativeSize] = useState(null);
  const [dealRequestMade, setDealRequestMade] = useState(false);
  const [dealPublished, setDealPublished] = useState(false);
  const [dealAccepted, setDealAccepted] = useState(false);
  const [dealActive, setDealActive] = useState(false);
  const [errorOne, setErrorOne] = useState(null);
  const [errorTwo, setErrorTwo] = useState(null);
  
  useEffect(() => {
    if (backupName !== "") {
      clock = setInterval(() => refrshStatus(), FIRST_UPDATE_INTERVAL);
    }
  }, [backupName]);

  async function startFullBackup() {
    //await provider.send("eth_requestAccounts", []);
    //const signer = await provider.getSigner();
    //const dealClient = new ethers.Contract(contractAddr, contractObj.abi, provider);                  // Contract Instance
    //const result = await dealClient.getBackupItem(commPasBytes);                                      // Smart contract call (view)

    const response = await fetch(START_URL, {
      method: 'GET',
    })
    .catch((err) => console.error("There was an error while tring to start full backup: ", err));
    const json = await response.json();
    setBackupName(json.folder);
  }

  async function refrshStatus() {
    const updateResp = await fetch(UPDATE_URL, {
      method: 'GET'
    });

    const newStatus = await updateResp.json();
    console.log("bn. ", backupName)
    console.log(newStatus )
    const ourBackup = newStatus[backupName];
    console.log("OUR BACKUP: ", ourBackup)
    if (ourBackup["fillArrayReady"]) setFillArrayReady(true);
    if (ourBackup["copyToMFSReady"]) {
      setCopyToMFSReady(true);
      setCarExportPercent(parseFloat(ourBackup[carExportPercent]));
    }
    if (ourBackup["carExportReady"]) setCarExportReady(true);
    if (ourBackup["commPCalculationReady"]) {
      setCommPCalculationReady(true);
      setPayloadCID(ourBackup["payloadCID"]);
      setCommP(ourBackup["commP"]);
      setPieceSize(ourBackup["pieceSize"]);
      setCumulativeSize(ourBackup["cumulativeSize"]);
    }
    if (ourBackup["commPCalculationError"]) setErrorOne(ourBackup["commPCalculationError"]);
    if (ourBackup["dealRequestMade"]) {
      console.log("DEAL REQUEST MADE!");
      // Start another timer.

    }
  }

  return (
    <main>
      <section className="backupSection">
        <article className="createBackupStart">
          <p>{"Full Backup"}</p>
          <button onClick={startFullBackup} className="">{"Start"}</button>
        </article>
      </section>

      <section className="backupSection">
        <article className="createBackupStart">
          <p>{"Folder Backup"}</p>
          {/** Some tree structure */}
        </article>
      </section>

      <section className="backupSection">
        <article className="createBackupDetails">
          <p>
            <code>{"Click on 'Start' or select a folder and click 'Start'."}</code>
          </p>

          {backupName && <p>
            <code>{"Backup name: "}{backupName}</code>
          </p>}
          
          {fillArrayReady && <>
            <p>
              <code>{"Pinned CIDs collected into array."}</code>
            </p>
            <p>
              <code>{"Copying files to MutableFileSystem..."}</code>
            </p>
          </>
          }

          {copyToMFSReady && <>
            <p>
              <code>{"Copying files to MFS is ready."}</code>
            </p>
            <p>
              <code>{"Exporting MFS into a car file..."}</code>
            </p>
            {(carExportPercent > 0) && <p><code>{"Export percent: "}{carExportPercent}</code></p>}
          </>
          }

          {carExportReady && <>
            <p>
              <code>{"MFS was exported into a CAR file. CAR file name: "}{backupName}{".car"}</code>
            </p>
            <p>
              <code>{"Calculating commP..."}</code>
            </p>
          </>
          }

          {commPCalculationReady && <>
            <p>
              <code>{"CommP was calculated. "}</code><br></br>
              <code>{"CommP (PieceCID): "}{commP}</code><br></br>
              <code>{"Payload CID: "}{payloadCID}</code><br></br>
              <code>{"CommP size (Piece Size): "}{pieceSize}</code><br></br>
              <code>{"Payload Size: "}{payloadSize}</code><br></br>
              <code>{"Cummulative Size: "}{cumulativeSize}</code>
            </p>
            <p>
              <code>{"Making deal request..."}</code>
            </p>
          </>
          }

          {errorOne && <>
            <p>
              <code>{"There was an error while calculating CommP: "}{JSON.stringify(errorOne)}</code>
            </p>
          </>
          }

          {dealRequestMade && <>
            <p>
              <code>{"The deal request was made."}</code>
            </p>
            <p>
              <code>{"Waiting for deal to be published..."}</code>
            </p>
          </>
          }

          {dealPublished && <>
            <p>
              <code>{"The deal was published."}</code>
            </p>
            <p>
              <code>{"Waiting for deals to be accepted..."}</code>
            </p>
          </>
          }

          {dealAccepted && <>
            <p>
              <code>{"The deals were accepted. The backup proccess is now finished."}</code>
            </p>
          </>
          }
          
        </article>
      </section>
    </main>
  )
}
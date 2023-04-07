import React, { useState } from 'react';
import { ethers } from 'ethers';
import CID from 'cids';
import contractObj from "./DealClient.json"
import { network } from './network';

const START_URL = "http://45.91.171.156:3000/backup/start";
const UPDATE_URL = "http://45.91.171.156:3000/backup/show-inprogress";
const FIRST_UPDATE_INTERVAL = 1500;         // ms
const SECOND_UPDATE_INTERVAL = 20000;       // ms

export default function Backup() {
  const networkId = network.defaultNetwork;
  const contractAddr = network.contract;
  const provider = new ethers.BrowserProvider(window.ethereum);

  const [theInterval, setTheInterval] = useState(null);
  const [backupName, setBackupName] = useState("");
  const [fillArrayReady, setFillArrayReady] = useState(false);
  const [copyToMFSReady, setCopyToMFSReady] = useState(false);
  const [carExportPercent, setCarExportPercent] = useState(null);
  const [carExportReady, setCarExportReady] = useState(false);
  const [commPCalculationReady, setCommPCalculationReady] = useState(false);
  const [dealRequestMade, setDealRequestMade] = useState(false);
  const [dealPublished, setDealPublished] = useState(false);
  const [dealAccepted, setDealAccepted] = useState(false);
  const [dealActive, setDealActive] = useState(false);
  const [errorOne, setErrorOne] = useState(null);
  const [errorTwo, setErrorTwo] = useState(null);




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

    const timeInt = setInterval(() => refrshStatus(), FIRST_UPDATE_INTERVAL);
    setTheInterval(timeInt);
  }

  async function refrshStatus() {
    const updateResp = await fetch(UPDATE_URL, {
      method: 'GET'
    });
    const newStatus = await updateResp.json();
    const ourBackup = newStatus[backupName];
    if (ourBackup[fillArrayReady]) setFillArrayReady(true);
    if (ourBackup[copyToMFSReady]) {
      setCopyToMFSReady(true);

    }
    if (ourBackup[carExportReady]) setCarExportReady(true);
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
            <code>Click on 'Start' or select a folder and click 'Start'.</code>
          </p>

          {backupName && <p>
            <code>Backup name: {backupName}</code>
          </p>}
          
          
        </article>
      </section>
    </main>
  )
}
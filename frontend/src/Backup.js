import React, { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import CID from 'cids';
import contractObj from "./DealClient.json"
import { network } from './network';

const START_URL = "http://45.91.171.156:3000/backup/start";

export default function Backup() {
  const networkId = network.defaultNetwork;
  const contractAddr = network.contract;
  const provider = new ethers.BrowserProvider(window.ethereum)
  const [progressIndicator1, setProgressIndicator1] = useState(false);
  const [progressIndicator2, setProgressIndicator2] = useState(false);

  async function startFullBackup() {
    //await provider.send("eth_requestAccounts", []);
    //const signer = await provider.getSigner();
    //const dealClient = new ethers.Contract(contractAddr, contractObj.abi, provider);                  // Contract Instance
    //const result = await dealClient.getBackupItem(commPasBytes);                                      // Smart contract call (view)

    axios
      .get(START_URL)
      .then(function (response) {
        console.log(response);
      });

    const response = await fetch(START_URL, {
      method: "GET",
      
    });
    console.log(await response.json());
  }

  return (
    <main>
      <section className="createBackupSection">
        <p>{"Full Backup"}</p>
        <button onClick={startFullBackup}>{"Start"}</button>
      </section>

      <section className="createBackupSection">
        <p>{"Folder Backup"}</p>
        {/** Some tree structure */}
      </section>

      <section className="createBackupSection">
        {progressIndicator1 && <p>{"Progress one done."}</p>}
        {progressIndicator2 && <p>{"Progress two done."}</p>}
      </section>
    </main>
  )
}
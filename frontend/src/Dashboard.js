import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { network } from './network';
import contractObj from "./DealClient.json"
import BackupList from './BackupList';
import './styles.css';
import CID from 'cids';

const CONTRACT_ADDRESS = network.contract;

function App() {
  const [contractFunds, setContractFunds] = useState(0);
  const [defaultRedundancy, setDefaultRedundancy] = useState(0);
  const [fullBackupList, setFullBackupList] = useState([]);
  const [folderBackupList, setFolderBackupList] = useState([]);
  const [incBackupList, setIncBackupList] = useState([]);       // This is not planned to be implemented in this month
  const networkId = network.defaultNetwork;
  const provider = new ethers.BrowserProvider(window.ethereum);

  useEffect(() => {
    const loadData = async () => {
      const fromHexString = (hexString) => Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
      await provider.send("eth_requestAccounts", []);                                                   // MetaMask requires requesting permission to connect users accounts
      const balanceOfContract = await provider.getBalance(CONTRACT_ADDRESS);
      const converted = Number.parseInt(balanceOfContract.toString());
      setContractFunds(converted);

      // Get the list of backups
      const fetchedList = await dealClient.getNameLookupArraySegment(0, 100);
      console.log("fetchedList: ", fetchedList)
      const nameLookupArray = fetchedList.map((rawData) => {
        console.log("rawData: ", rawData);
        console.log("name: ", rawData.name)
        console.log("hex commP: ", rawData.commP)
        const byteArray = fromHexString(rawData.commP);
        const cidObj = new CID(byteArray.subarray(1))
        console.log("commP: ", cidObj.toString())

        return {
          name: rawData.name,
          commP: cidObj.toString()
        }
      });
      console.log(nameLookupArray)

      const FullRegEx = /backup[0-9]{12,14}/gm;
      const IncRegEx = /inc[0-9]{12,14}/gm;

      // Does not load the details about that backup. Only when we click on it.
      let fullList = [];
      let folderList = [];
      let incList = [];
  
      for (let i = 0; i < nameLookupArray.length; i++) {
        if (nameLookupArray[i].name.match(FullRegEx) !== null) {
          fullList.push(nameLookupArray[i]);
        } else if (nameLookupArray[i].name.match(IncRegEx) !== null) {
          incList.push(nameLookupArray[i]);
        } else {
          folderList.push(nameLookupArray[i]);
        }
      }

      const redundancy = await dealClient.getDefaultTargetRedundancy();

    console.log(fullBackupList)
      setFullBackupList(fullList);
      setFolderBackupList(folderList);
      setIncBackupList(incList);
      setDefaultRedundancy(redundancy)
    }

    loadData();
  }, []);

  async function changeTargetRedundancy() {
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner()
    const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
    const newValue = parseInt(window.prompt());
    if (newValue < 0) return;
    const result = await dealClient.changeDefaultTargetRedundancy(newValue);
    if (result) setDefaultRedundancy(newValue);
  }

  return (
    <main id="dashboard">
      <h1>Contract Address:</h1>
      <h2>{CONTRACT_ADDRESS}</h2>

      <h1>Available funds:</h1>
      <h2>{contractFunds} {" FIL"}</h2>
      <h1>Default Target Redundancy</h1>
      <h2>
        <button id="redundancyButton" onClick={changeTargetRedundancy}>{defaultRedundancy.toString()}</button>
      </h2>


      <section className="backupSection">
        <BackupList whichOneSwitch={'full'} backupList={fullBackupList} />
      </section>

      <section className="backupSection">
        <BackupList whichOneSwitch={'folder'} backupList={folderBackupList} />
      </section>

      {/*<section className="backupSection">
        <BackupList whichOneSwitch={'incremental'} backupList={incBackupList} />
      </section>*/}
    </main>
  );
}

export default App;

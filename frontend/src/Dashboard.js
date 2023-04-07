import { useState, useEffect } from 'react';
import { decodeBase58, encodeBase58, ethers } from 'ethers';
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
      /**exp area */
      const fromHexString = (hexString) => Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
      const byteArray = fromHexString("0x0181e203922020644695b176b700e710e994967b298ae422099bd3ad05bd8e4bffd206130aa611");
      const newCID = new CID(byteArray.subarray(1))
      console.log("CID: ", newCID.toString())
      
      
      /**-< exp area */

      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const dealClient = new ethers.Contract(CONTRACT_ADDRESS, contractObj.abi, signer);
      await provider.send("eth_requestAccounts", []);                                                   // MetaMask requires requesting permission to connect users accounts
      const balanceOfContract = await provider.getBalance(CONTRACT_ADDRESS);
      const converted = Number.parseInt(balanceOfContract.toString());
      setContractFunds(converted);

//      console.log("cidHex: ", cidHex)
      // Get the list of backups
      const fetchedList = await dealClient.getNameLookupArraySegment(0, 100);
      const nameLookupArray = fetchedList.map((rawData) => {
        console.log("rawData: ", rawData);
        console.log("name: ", rawData.name)
        const byteArray = fromHexString(rawData.commP);
        const cidObj = new CID(byteArray.subarray(1))
        console.log("CID: ", cidObj.toString())
        //const byteArray = buffer.Buffer.from(rawData.commP);
        //console.log(byteArray)
        //console.log("commP: ",  new CID(byteArray).toBaseEncodedString("base58btc"))

        return {
          name: rawData.name,
          commP: cidObj.toString()
        }
      })
      console.log(nameLookupArray)
      //console.log("fetchedList: ", fetchedList
      /*

      const nameLookupArray = [
        { name: "backup1680606586626",  commP: "baga6ea4seaqos4r6jutakkbkmo7dfproobrcvaaijrjwbbn6jq5u233lfc6amla" },
        { name: "hello42_folder1680606586626", commP: "baga6ea4seaqeuvzsi5iwo7oooae7uhb7kfahjclfwzlpdijgvibvnteuzjye6ji" },
        { name: "backup1680266820969", commP: "baga6ea4seaqeuvzsi5iwo7oooae7uhb7kfahjclfwzlpdijgvibvnteuzjye6ji"}
      ];*/
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

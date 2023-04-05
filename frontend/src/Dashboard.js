import { useState, useEffect } from 'react';
import BackupList from './BackupList';
import './styles.css';


function App() {
  const [contractAddress, setContractAddress] = useState("0x1cbB663F29a3EF12528BB8F66A906131f277b7CB");
  const [contractFunds, setContractFunds] = useState(0);
  const [fullBackupList, setFullBackupList] = useState([]);
  const [folderBackupList, setFolderBackupList] = useState([]);
  const [incBackupList, setIncBackupList] = useState([]);       // This is not planned to be implemented in this month

  useEffect(() => {
    const loadData = async () => {
      // Get the list of backups
      const nameLookupArray = [
        { name: "backup1680606586626",  commP: "baga6ea4seaqos4r6jutakkbkmo7dfproobrcvaaijrjwbbn6jq5u233lfc6amla" },
        { name: "hello421680606586626", commP: "baga6ea4seaqeuvzsi5iwo7oooae7uhb7kfahjclfwzlpdijgvibvnteuzjye6ji" },
        { name: "backup1680266820969", commP: "baga6ea4seaqeuvzsi5iwo7oooae7uhb7kfahjclfwzlpdijgvibvnteuzjye6ji"}
      ];
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

      console.log(fullBackupList)
      setFullBackupList(fullList);
      setFolderBackupList(folderList);
      setIncBackupList(incList);
    }

    loadData();
  }, []);

  return (
    <main id="dashboard">
      <h1>Contract Address:</h1>
      <h2>{contractAddress}</h2>

      <h1>Available funds:</h1>
      <h2>{contractFunds} {" FIL"}</h2>

      <section className="backupSection">
        <BackupList whichOneSwitch={'full'} backupList={fullBackupList} />
      </section>

      <section className="backupSection">
        <BackupList whichOneSwitch={'folder'} backupList={folderBackupList} />
      </section>

      <section className="backupSection">
        <BackupList whichOneSwitch={'incremental'} backupList={incBackupList} />
      </section>
    </main>
  );
}

export default App;
import React, { useState, useEffect, useRef } from 'react';
import { animateScroll } from 'react-scroll';
import { network } from './network';
import { Link } from 'react-router-dom';
import Tree from './Components/Tree';

const BASE_URL = network.server;
const START_URL = `http://${BASE_URL}:3000/backup/start`;
const FOLDER_START_BASE_URL = `http://${BASE_URL}:3000/backup/folder?name=`;
const UPDATE_URL = `http://${BASE_URL}:3000/backup/show-inprogress`;
const MFS_TREE_URL = `http://${BASE_URL}:3000/ipfs/mfs-tree?depth=1`;
const FIRST_UPDATE_INTERVAL = 1500;         // ms
const SECOND_UPDATE_INTERVAL = 20000;       // ms
const BACKUP_FOLDER = "IPFS_BACKUP_PREPARE_FOLDER";     // will be excluded (BASE_FOLDER in Express)

export default function StartBackup() {
  let clock = null;
  let scroll = animateScroll;

  const [mfsTree, setMfsTree] = useState({});
  const [thePath, setThePath] = useState("");

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
  const [errorOne, setErrorOne] = useState(null);
  const [done, setDone] = useState(false);
  
  // Load MFS Tree
  useEffect(() => {
    const loadMfsTree = async () => {
      const response = await fetch(MFS_TREE_URL, { method: 'GET'});
      const tree = (await response.json()).mfsTree;
      console.log("Tree: ", tree);
      if (tree) setMfsTree(tree);
    }

    loadMfsTree();
  }, []);

  useEffect(() => {
    if (backupName !== "") {
      clock = setInterval(() => refrshStatus(), FIRST_UPDATE_INTERVAL);
    }
  }, [backupName]);

  useEffect(() => {
    scroll.scrollToBottom({
      containerId: "terminal"
    });
  }, [done])

  async function startFullBackup() {
    const response = await fetch(START_URL, { method: 'GET' })
      .catch((err) => console.error("There was an error while tring to start full backup: ", err));

    const json = await response.json();
    setBackupName(json.backupName);
  }

  async function startFolderBackup() {
    if (thePath.length === 0) window.alert("Please select a folder first!");
    const response = await fetch(FOLDER_START_BASE_URL + thePath, { method: 'GET' })
      .catch((err) => console.error("There was an error while trying to start folder backup: ", err));

    const json = await response.json();
    setBackupName(json.backupName);
  }

  async function refrshStatus() {
    const updateResp = await fetch(UPDATE_URL, {
      method: 'GET'
    });

    const newStatus = await updateResp.json();
    const ourBackup = newStatus[backupName];
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
      setPayloadSize(ourBackup["payloadSize"]);
      
      clearInterval(clock);
      clock = setInterval(() => refreshDealStatus(), SECOND_UPDATE_INTERVAL);
      setDone(true);
    }
    if (ourBackup["commPCalculationError"]) setErrorOne(ourBackup["commPCalculationError"]);

    scroll.scrollToBottom({
      containerId: "terminal"
    });
  }
  
  async function refreshDealStatus() {
    const updateResp = await fetch(UPDATE_URL, {
      method: 'GET',
    });
    
    const newStatus = await updateResp.json();
    const ourBackup = newStatus[backupName];
    if (ourBackup["dealRequestMade"]) setDealRequestMade(true);
    if (ourBackup["dealPublished"]) {
      setDealPublished(true);
      clearInterval(clock)
    }

    scroll.scrollToBottom({
      containerId: "terminal"
    });
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
          <code>{thePath}</code>
          <button onClick={startFolderBackup}>{"Start"}</button>
        </article>
        <article id="treeContainer">
          <Tree mfsTreeObj={mfsTree} setPath={setThePath}/>
        </article>
      </section>

      <section className="backupSection">
        <article id="terminal" className="createBackupDetails">
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
              <code>{"Making deal requests..."}</code>
            </p>
          </>
          }

          {errorOne && (Object.keys(errorOne).length > 0) && <>
            <p>
              <code>{"There was an error while calculating CommP: "}{JSON.stringify(errorOne)}</code>
            </p>
          </>
          }

          {dealRequestMade && <>
            <p>
              <code>{"The deal requests were made."}</code>
            </p>
            <p>
              <code>{"Waiting for deals to be published..."}</code>
            </p>
          </>
          }

          {dealPublished && <>
            <p>
              <code>{"The deal was published."}</code><br></br>
              <code className="backupDoneMessage">{"You can check the health of this backup item here: "}
                <Link to={'/backupDetails/' + commP}>{commP} </Link>
              </code>
            </p>
            <p>
              <code>{"The backup proccess is now finished."}</code>
            </p>

          </>
          }
        </article>
      </section>
    </main>
  )
}
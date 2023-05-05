import React from 'react';
import { Link } from 'react-router-dom';


// @whichOneSwitch full | folder | incremental (inceremental does not exist yet)
export default function BackupList({whichOneSwitch, backupList}) {
  const folderRegEx = /folder([0-9]{13,14})/;
  const backupRegEx = /backup([0-9]{13,14})/;
  const incRegEx = /inc([0-9]{13,14})/;
  let title = null;
  let RegEx = /[0-9]{13,14}/;
  
  switch (whichOneSwitch) {
    case "full":
      title = "Full Backups";
      RegEx = backupRegEx
      break;
    case "folder":
      title = "Folder Backups";
      RegEx = folderRegEx
      break;
    case "incremental":
      title = "Incremental Backups";
      RegEx = incRegEx;
      break;
    default:
      title = "{Application error}";
      break;
  }

  return (
      <details className="backupList">
        <summary>{title}</summary>
        {backupList.length > 0 ? (
          <ul>
            {backupList.map((backup, index) => {
              const match = RegEx.exec(backup.name);
              const dateString = match ? match[1] : '';
              const timestamp = Number.parseInt(dateString);
              const time = new Date(timestamp);

              return (
                <li className="backupEntry" key={index}>
                  <Link to={`/backupDetails/${backup.commP}`}>
                    <p>{"Time of backup: "}{time.toDateString()}</p>
                    <p>{"CommP:"}{backup.commP}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )
        : 
          <ul>
            <p key={0}>{"This list is empty."}</p>
          </ul>
        }
      </details>
  )
}

import React from 'react';

export default function Tree({ mfsTreeObj, depth = 0  , path = "" }) {
  let dashString = "";
  for (let i = 0; i < depth; i++) {
    dashString += "--";
  }

  if (typeof mfsTreeObj === "object" && mfsTreeObj !== null) {
    return (
      <div>
        {Object.entries(mfsTreeObj).map(([key, value]) => 
        {
        if (key === "/") 
          return <></>;
        else
          return (
            <React.Fragment>
              <p onClick={() => window.alert(path + key)}>
                {dashString}{key}
              </p>
              <Tree mfsTreeObj={value} depth={depth+1} path={path + "/" + key}/>
            </React.Fragment>
          )})}
      </div>
    )
  } else {
    return <></>;
  }
}

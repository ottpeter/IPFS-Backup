async function getFileSystem(ipfs, path, depth, limit) {
  if (depth === limit) return "END";

  const files = await ipfs.files.ls(path);  
  let nextItem = null;
  const fileData = {};

  do {
    nextItem = await files.next();
    if (nextItem.done) continue;

    if (nextItem.value.type === "directory") {
      fileData[nextItem.value.name] = await getFileSystem(ipfs, `${path}/${nextItem.value.name}`, depth+1, limit);
    } else {
      fileData[nextItem.value.name] = nextItem.value.cid;
    }
  } while (!nextItem.done);

  
  /*console.log("fileData: ", fileData)*/
  return fileData;
}

async function createIPFSinstance() {
  const { create, CID, globSource } = await import('kubo-rpc-client');
  const ipfs = create();          // Default, http://localhost:5001

  return { ipfs, CID, globSource}
}


module.exports = { 
  getFileSystem,
  createIPFSinstance
}
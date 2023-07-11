var BoxSDK = require('box-node-sdk');
var sdkConfig = {
  boxAppSettings: {
    clientID: '[CLIENT_ID]',
    clientSecret: '[CLIENT_SECRET]'
},
  enterpriseID: '[ENTERPRISE_ID]'};

//initialize the box connection
const sdk = BoxSDK.getPreconfiguredInstance(sdkConfig);
const client = sdk.getAnonymousClient();

const fs = require('fs');
const exifr = require('exifr');


//Use the exifr library to parse out the custom metadata
const readImageMetadata = async (file) => {

  try {
    //run the file through the parser and extract the "subject" - this is the custom metadata from XMP
    const parsedExif = await exifr.parse(file, {xmp: true})
      .then(output => {
        if (output.subject) {
          return output.subject
        } else {
          return
        }
      }).catch(e => {
        console.log(e)
      })

    return parsedExif
  } catch (e) {
    console.log(e)
  }

}

const folderPath = './images/'

//Download all items in a folder to the ./images folder
const getImagesFromBoxFolder = async () => {
  let items = await client.folders.getItems('216186108926')

  for (let i=0; i < items.entries.length; i++) {
    let file = await client.files.get(items.entries[i].id, {fields: 'name'})
    
 
    await client.files.getReadStream(items.entries[i].id, null, (error, stream) => {
      if (error) {
        console.log('e', error)
      } else {
        
        let output = fs.createWriteStream(folderPath + file.name)
        stream.pipe(output)
        
      }
    })
  }

  return items;
}


const run = async () => {
 let files = await getImagesFromBoxFolder()
 files.entries.forEach(async file => {
  const item = folderPath + file.name;

  let metadata = await readImageMetadata(item)
  let metadataString = ''
  let count = 1
  //Ensure there is custom metadata on the file.
  //Additionally, if there is more than one term, exifr returns an array.
  //Below, we will parse that array into a comma-separated list of values
  if (typeof metadata != 'string' && metadata != undefined) {
    metadata.forEach(term => {
      if (count === metadata.length ) {
        metadataString += term
      } else {
        metadataString += term + ', '
        count += 1
      }
    })
  } else if (metadata != undefined ){
    metadataString = metadata
  } else {
    return
  }
  

  console.log(metadataString)

  //Add the metadata to the file
  await client.files.addMetadata(file.id, client.metadata.scopes.ENTERPRISE, "[Template_name]", {
    subject: metadataString,

  }).then(response => {

  }).catch(e => {
    console.log(e)
  })

})
  

  



}

run()






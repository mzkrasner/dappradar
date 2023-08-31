import { CeramicClient } from "@ceramicnetwork/http-client";
import { ComposeClient } from "@composedb/client";
import { RuntimeCompositeDefinition } from "@composedb/types";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import KeyResolver from "key-did-resolver";
import { NextApiRequest, NextApiResponse } from "next";
import { fromString } from "uint8arrays/from-string";

import { definition } from "../../src/__generated__/definition.js";

//this is a fake dummy key
const uniqueKey =
  "dfabafa4168279e29d326b5f3eecc64c0faddc69ff089f2381f81249e5368882";

export default async function create(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  //instantiate a ceramic client instance
  const ceramic = new CeramicClient("http://localhost:7007");

  //instantiate a composeDB client instance
  const composeClient = new ComposeClient({
    ceramic: "http://localhost:7007",
    definition: definition as RuntimeCompositeDefinition,
  });

  const authenticateDID = async (seed: string) => {
    const key = fromString(seed, "base16");
    const provider = new Ed25519Provider(key);
    const staticDid = new DID({
      resolver: KeyResolver.getResolver(),
      provider,
    });
    await staticDid.authenticate();
    ceramic.did = staticDid;
    return staticDid;
  };

  try {
    const did = await authenticateDID(uniqueKey);
    console.log(did);
    composeClient.setDID(did);

    //generating dummy data
    const log = [];
    let hour = 10;
    while (hour < 24) {
      let minute = 0;
      while (minute < 60) {
        let finalMin;
        if (minute < 10) {
          finalMin = "0" + minute.toString();
        } else {
          finalMin = minute.toString();
        }
        const str = "2007-12-03T" + hour.toString() + ":" + finalMin + ":30Z";
        log.push(str);
        minute++;
      }
      hour++;
    }
    const returnLog = [];
    //populate composeDB with dummy data
    for (let i = 0; i < log.length; i++) {
      const pages = ["HOME", "PRODUCTS", "SERVICES", "CONTACT"];
      const indexPage = Math.floor(Math.random() * 3);
      const person = Math.floor(Math.random() * 100) + 1;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const data = await composeClient.executeQuery(`
        mutation {
            createPageview(input: {
            content: {
                visitor: ${person}
                page: ${pages[indexPage]}
                time: "${log[i]}"
            }
            })
            {
            document {
                id
                visitor
                page
                time
            }
            }
        }
        `);
      console.log(data);
      returnLog.push(data);
    }

    res.json({
      returnLog,
    });
  } catch (err) {
    res.json({
      err,
    });
  }
}

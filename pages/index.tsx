import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { BasicProfile } from "@datamodels/identity-profile-basic";
import { startLitClient } from "../utils/client";
import {
  _encryptWithLit,
  _decryptWithLit,
  encodeb64,
  decodeb64,
} from "../utils/lit";
import ceramicLogo from "../public/ceramic.png";
import { useCeramicContext } from "../context";
import { authenticateCeramic } from "../utils";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  const clients = useCeramicContext();
  const { ceramic, composeClient } = clients;
  const [profile, setProfile] = useState<BasicProfile | undefined>();
  const [loading, setLoading] = useState<boolean>(false);
  const [val, setVal] = useState("");
  const [res, setRes] = useState("");
  const [lit, setLit] = useState<any>();
  const chain = "polygon";

  const accessControlConditions = [
    {
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: [":userAddress", "latest"],
      returnValueTest: {
        comparator: ">=",
        value: "1000000000000", // 0.000001 ETH
      },
    },
  ];

  const handleLogin = async () => {
    await authenticateCeramic(ceramic, composeClient);
    await getProfile();
    const thisLit = await startLitClient(window);
    setLit(thisLit);
  };

  const getProfile = async () => {
    setLoading(true);
    if (ceramic.did !== undefined) {
      const profile = await composeClient.executeQuery(`
        query {
          viewer {
            basicProfile {
              id
              name
              description
              gender
              emoji
            }
          }
        }
      `);
      setProfile(profile?.data?.viewer?.basicProfile);
      setLoading(false);
    }
  };

  const createMessage = async () => {
    setLoading(true);
    if (ceramic.did !== undefined && val.length) {
      const item = await _encryptWithLit(val, accessControlConditions, chain);
      const stringified = JSON.stringify(accessControlConditions);
      const b64 = new TextEncoder().encode(stringified);
      const encoded = await encodeb64(b64);
      console.log(item);
      const query = await composeClient.executeQuery(`
        mutation {
          createMessage(input: {
            content: {
              encryptedMessage: "${item[0]}"
              symKey: "${item[1]}"
              chain: "${chain}"
              accessControlConditions: "${encoded}"
              accessControlConditionType: "accessControlConditions"
            }
          }) 
          {
            document {
              encryptedMessage
              symKey
              chain
              accessControlConditions
              accessControlConditionType
            }
          }
        }
      `);
      console.log(query);
      setRes(JSON.stringify(query))
      await getProfile();
      setLoading(false);
    }
    setVal("");
  };

  const decryptMessage = async () => {
    setLoading(true);
    if (ceramic.did !== undefined) {
      const query = await composeClient.executeQuery(`
        query {
          messageIndex(last: 1){
            edges{
              node{
                encryptedMessage
                symKey
                chain
                accessControlConditions
                accessControlConditionType
              }
            }
          }
        }
      `);
      const results = query.data?.messageIndex?.edges[0].node;
      const encryptedMessage = await decodeb64(results.encryptedMessage);
      const symKey = await decodeb64(results.symKey);
      const accessControl = await decodeb64(results.accessControlConditions);
      const decoded = new TextDecoder().decode(accessControl);
      const accessControlConditionType = results.accessControlConditionType;
      console.log(encryptedMessage, symKey, chain, JSON.parse(decoded), accessControlConditionType);
      const item = await _decryptWithLit(
        encryptedMessage,
        symKey,
        JSON.parse(decoded),
        chain
      );
      console.log(item);
      if(typeof(item) === 'string'){
        setRes(item)
      }
      await getProfile();
      setLoading(false);
    }
  };

  const createProfile = async () => {
    setLoading(true);
    if (ceramic.did !== undefined ) {
     
      const query = await composeClient.executeQuery(`
        mutation {
          createProfile(input: {
            content: {
              displayName: "${val}"
            }
          }) 
          {
            document {
              id
              author{
                id
              }
              displayName
            }
          }
        }
      `);
      console.log(query);
      setRes(JSON.stringify(query))
      await getProfile();
      setLoading(false);
    }
    setVal("");
  };

  // const createResearchObj = async () => {
  //   setLoading(true);
  //   if (ceramic.did !== undefined ) {
     
  //     const query = await composeClient.executeQuery(`
  //       mutation {
  //         createResearchObject(input: {
  //           content: {
  //             title: "This is a title"
  //             manifest: "bafyreicse4sbor33iacv2jzgpd333uxwidlvjp3lt7a2coxbobxdan4d7m"
  //             metadata: "this is some dummy text"
  //           }
  //         }) 
  //         {
  //           document {
  //             id
  //             author{
  //               id
  //             }
  //             title
  //           }
  //         }
  //       }
  //     `);
  //     console.log(query);
  //     setRes(JSON.stringify(query))
  //     await getProfile();
  //     setLoading(false);
  //   }
  //   setVal("");
  // };

  /**
   * On load check if there is a DID-Session in local storage.
   * If there is a DID-Session we can immediately authenticate the user.
   * For more details on how we do this check the 'authenticateCeramic function in`../utils`.
   */
  useEffect(() => {
    if (localStorage.getItem("did")) {
      handleLogin();
    }
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create ceramic app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {profile === undefined && ceramic.did === undefined ? (
          <button
            onClick={() => {
              handleLogin();
            }}
          >
            Login
          </button>
        ) : (
          <>
            {" "}
            <div className={styles.formGroup2}>
              <label>Result </label>
              <textarea
                style={{"height": "20rem", "width": "50rem",  "padding": "1rem"}}
                value={res}
                onChange={(e) => {
                  setRes(e.target.value);
                }}
              />
            </div>
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>DisplayName</label>
                <textarea
                  style={{"height": "3rem", "width": "20rem", "padding": "1rem"}}
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  createProfile();
                }}
              >
                {loading ? "Loading..." : "Create Profile"}
              </button>
              {/* <button
                onClick={() => {
                  createResearchObj();
                }}
              >
                {loading ? "Loading..." : "Create Research Obj"}
              </button> */}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Home;

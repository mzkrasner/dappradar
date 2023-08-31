import { readFileSync } from "fs";
import { CeramicClient } from "@ceramicnetwork/http-client";
import {
  createComposite,
  readEncodedComposite,
  writeEncodedComposite,
  writeEncodedCompositeRuntime,
} from "@composedb/devtools-node";
import { Composite } from "@composedb/devtools";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver } from "key-did-resolver";
import { fromString } from "uint8arrays/from-string";

const ceramic = new CeramicClient("http://localhost:7007");

/**
 * @param {Ora} spinner - to provide progress status.
 * @return {Promise<void>} - return void when composite finishes deploying.
 */
export const writeComposite = async (spinner) => {
  await authenticate();
  spinner.info("writing composite to Ceramic");

  // const profileComposite = await createComposite(
  //   ceramic,
  //   "./composites/00-profile.graphql"
  // );

  // const researchObj = await createComposite(
  //   ceramic,
  //   "./composites/01-researchObj.graphql"
  // );

  // const orgComposite = await createComposite(
  //   ceramic,
  //   "./composites/02-organization.graphql"
  // );

  // const profAttestationSchema = readFileSync(
  //   "./composites/03-profileAttestation.graphql",
  //   {
  //     encoding: "utf-8",
  //   }
  // ).replace("$PROFILE_ID", profileComposite.modelIDs[0]);

  // const profAttestationComposite = await Composite.create({
  //   ceramic,
  //   schema: profAttestationSchema,
  // });

  // const researchAttestationSchema = readFileSync(
  //   "./composites/04-ResearchObjAttestation.graphql",
  //   {
  //     encoding: "utf-8",
  //   }
  // ).replace("$RESEARCH_ID", researchObj.modelIDs[0]);

  // const researchAttestationComposite = await Composite.create({
  //   ceramic,
  //   schema: researchAttestationSchema,
  // });

  // const profileOfSchema = readFileSync("./composites/05-profileOf.graphql", {
  //   encoding: "utf-8",
  // })
  //   .replace("$PROFILE_ID", profileComposite.modelIDs[0])
  //   .replace("$ORG_ID", orgComposite.modelIDs[0]);

  // const profileOfComposite = await Composite.create({
  //   ceramic,
  //   schema: profileOfSchema,
  // });

  // const orgToProfileSchema = readFileSync("./composites/06-OrganizationToProfile.graphql", {
  //   encoding: "utf-8",
  // }).replace("$PROFILEOF_ID", profileOfComposite.modelIDs[2])
  //   .replace("$ORG_ID", orgComposite.modelIDs[0]);

  // const orgToProfileComposite = await Composite.create({
  //   ceramic,
  //   schema: orgToProfileSchema,
  // });

  const pageviewComposite = await createComposite(
    ceramic,
    "./composites/00-pageview.graphql"
  );

  const composite = Composite.from([
    pageviewComposite
    // profileComposite,
    // researchObj,
    // orgComposite,
    // profAttestationComposite,
    // researchAttestationComposite,
  //   profileOfComposite,
  //   orgToProfileComposite
   ]);

  await writeEncodedComposite(composite, "./src/__generated__/definition.json");
  spinner.info("creating composite for runtime usage");
  await writeEncodedCompositeRuntime(
    ceramic,
    "./src/__generated__/definition.json",
    "./src/__generated__/definition.js"
  );
  spinner.info("deploying composite");
  const deployComposite = await readEncodedComposite(
    ceramic,
    "./src/__generated__/definition.json"
  );

  await deployComposite.startIndexingOn(ceramic);
  spinner.succeed("composite deployed & ready for use");
};

/**
 * Authenticating DID for publishing composite
 * @return {Promise<void>} - return void when DID is authenticated.
 */
const authenticate = async () => {
  const seed = readFileSync("./admin_seed.txt");
  const key = fromString(seed, "base16");
  const did = new DID({
    resolver: getResolver(),
    provider: new Ed25519Provider(key),
  });
  await did.authenticate();
  ceramic.did = did;
};

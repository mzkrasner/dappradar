# ComposeDB with Enabled HLL

This is a rough proof-of-concept to show how one could use Hyperloglog (HLL) with ComposeDB.

For more information on HLL, visit [High-compression Metrics Storage with Postgres Hyperloglog](https://www.crunchydata.com/blog/high-compression-metrics-storage-with-postgres-hyperloglog)

## Getting Started: 

Note that this dummy application uses a single "pageview" model - you can find its definition in `/composites/00-pageview.graphql`.

The steps below outline how HLL can be used with ComposeDB in the context of analyzing and extracting approximate pageview analytics, specifically pageviews from unique visitors over 1-hour periods.

### Part 1 - Setup and Populate with Dummy Data:

1. Install your dependencies:

Install your dependencies:

```bash
npm install
```

2. Generate your admin seed, admin did, and ComposeDB configuration file:

```bash
npm run generate
```

3. Launch postgres with the provided configuration in the docker-compose.yml file (you will need Docker installed locally):

```bash
docker-compose up
```

4. Begin your application in a new terminal (first ensure you are running node v16 in your terminal):

```bash
npm run dev
```

5. In a new terminal, begin a remote postgres terminal session:

```bash
docker exec -it postgresql psql -d postgres -U admin
```

6. Using your postgres terminal, locate the stream ID being used as the table name to host each ComposeDB model instance. It will have a name starting with "k" and will appear as a string of random letters and integers. You will need this for some of the following steps:

```bash
(postgres terminal) 

\dt*.*
```

7. Trigger the following endpoint with a GET request to populate your table (you can use Postman or use curl):

```bash
curl http://localhost:3000/api/create
```

You can check on the status of the population of dummy data by performing the following in your postgres terminal (make sure to replace the table name with your unique stream from step 6):

```bash
(postgres terminal) 

SELECT COUNT(stream_id) FROM kjzl6hvfrbw6c7ywypher7e8qu3anaky4j2lqred760lcvcf7s363ndk5ujwf1u;
```
Once the count reaches 840, the dummy data has been populated, and you can continue with part 2 below (this may take a few moments)

### Part 2 - Add HLL Extension and Test Performance

1. Back in your postgres terminal, establish an hll extension:

```bash
(postgres terminal)

CREATE EXTENSION hll;
```

2. Create an hour-based rollup table - the `visitor` field will contain an integer between 1-100 representing a unique human (see /api/create.ts to see how I auto-populated the table with dummy data), and `stream_content` field contains hashed values using the HLL algorithm, allowing us to obtain approximate counts of the values:

```bash
(postgres terminal) 

CREATE TABLE pageview_hourly_rollup (
    hour timestamp,
    visitor int,
    stream_content hll,
    unique (hour, visitor)
);
```
3. Aggregate and store your data from your table containing 840 rows after replacing the table name with yours(this will only work once due to the `unique` constraint):

```bash
(postgres terminal) 

INSERT INTO pageview_hourly_rollup
    SELECT
        date_trunc('hour', TO_TIMESTAMP(stream_content->>'time', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')::timestamp) AS hour,
        CAST(stream_content->>'visitor' AS INTEGER) AS visitor,
        hll_add_agg(hll_hash_integer(CAST(stream_content->>'visitor' AS INTEGER)))
    FROM kjzl6hvfrbw6c7ywypher7e8qu3anaky4j2lqred760lcvcf7s363ndk5ujwf1u 
    GROUP BY 1, 2;
```
4. Turn timing on to test performance and run an aggregation query:

```bash
(postgres terminal) 

\timing

SELECT
   hour,
  hll_cardinality(hll_union_agg((stream_content))) AS hourly_uniques
FROM pageview_hourly_rollup
GROUP BY 1
ORDER BY 1
LIMIT 15;
```

5. Compare performance against the equivalent query ran without hll:

```bash
(postgres terminal) 

SELECT
  date_trunc('hour', TO_TIMESTAMP(stream_content->>'time', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')::timestamp) AS hour,
  COUNT(DISTINCT CAST(stream_content->>'visitor' AS INTEGER)) AS visitor
FROM kjzl6hvfrbw6c7ywypher7e8qu3anaky4j2lqred760lcvcf7s363ndk5ujwf1u
GROUP BY 1
ORDER BY 1
LIMIT 15;
```

## Learn More

To learn more about Ceramic please visit the following links

- [Ceramic Documentation](https://developers.ceramic.network/learn/welcome/) - Learn more about the Ceramic Ecosystem.
- [ComposeDB](https://composedb.js.org/) - Details on how to use and develop with ComposeDB!

You can check out [Create Ceramic App repo](https://github.com/ceramicstudio/create-ceramic-app) and provide us with your feedback or contributions! 

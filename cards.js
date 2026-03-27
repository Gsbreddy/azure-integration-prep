// ===== CHEAT SHEET CARDS (Topics 5-20) =====

const CARDS = [

{
    id: "topic5",
    num: "05",
    title: "Azure Storage",
    isKey: false,
    oneThing: "Storage is the silent backbone of every Azure integration — Logic Apps Standard state, Function App coordination, Event Hub Capture, Integration Account maps — it's all Storage under the hood.",
    story: "On the Insurance project, every Logic App Standard workflow wrote its run state to a Storage Account — that's how stateful workflows survive restarts. I connected all integration components to Storage using Managed Identity with Storage Blob Data Contributor scope, not connection strings. When we had an incident where run history was ballooning costs, I added lifecycle policies to archive processed-payload blobs after 30 days.",
    concepts: [
      { title: "Account & Service Types", body: "A Storage Account is the top-level namespace. Inside it you get Blobs (unstructured files), Queues (simple task offloading), Tables (NoSQL key-value audit logs), and Files (SMB shares for legacy adapters). For Azure Integration the Blob service is dominant." },
      { title: "Access Control", body: "Prefer Managed Identity over connection strings for all internal Azure-to-Azure communication. Assign built-in RBAC roles (Storage Blob Data Contributor, Reader, etc.) at the container or account level. Use SAS tokens only for time-limited external partner access where MI is not possible." },
      { title: "Cost & Lifecycle Management", body: "Blob access tiers determine the cost trade-off: Hot for active data, Cool for infrequent access, Cold for rarely accessed, Archive for long-term retention. Lifecycle management policies automatically transition or delete blobs based on age — essential for controlling run-history storage costs in Logic Apps." },
      { title: "Integration-Specific Roles", body: "Storage underpins Logic Apps Standard run state, Function App internal coordination (AzureWebJobsStorage), Event Hub Capture output (Avro format), and Integration Account artifact storage. Treat the Storage Account as critical infrastructure — zone-redundant replication (ZRS) or geo-redundant (GRS) depending on your RPO." }
    ],
    terms: [
      ["Blob / Hot / Cool / Cold / Archive", "Five access tiers: Hot = fastest & most expensive reads; Cool = 30-day min; Cold = 90-day min; Archive = offline, hours to rehydrate, cheapest storage cost."],
      ["SAS Token", "Signed URL granting scoped, time-limited access to a specific blob, container, or account. Use for external partners; use Managed Identity for internal Azure services."],
      ["Lifecycle Policy", "JSON rules applied to a container that auto-transition blobs between tiers or delete them based on last-modified or last-accessed age."],
      ["Managed Identity Connection", "Passwordless auth to Storage. Set AzureWebJobsStorage__accountName and AzureWebJobsStorage__credential=managedidentity in Function App settings — no connection string needed."],
      ["Storage Account Kind", "Standard (HDD-backed, general purpose v2) vs Premium (SSD-backed, low-latency). For Logic Apps Standard and Function Apps use Standard GPv2. Premium is for high-IOPS scenarios."],
      ["ZRS / GRS", "Zone-Redundant Storage replicates across 3 AZs in one region. Geo-Redundant Storage adds async replication to a paired region. Use ZRS minimum for production integration storage."],
      ["Blob Versioning", "Automatically keeps previous versions of a blob on overwrite. Useful for audit trails on Integration Account map files."],
      ["Private Endpoint", "Exposes the Storage Account on your VNet private IP, disabling public internet access. Required when the Logic App Standard or Function App is VNet-integrated and the firewall is locked down."]
    ],
    comparison: {
      title: "Blob Access Tiers",
      headers: ["Tier", "Storage Cost", "Read Cost", "Min Duration", "Use Case"],
      rows: [
        ["Hot", "Highest", "Lowest", "None", "Active run histories, current payloads"],
        ["Cool", "Medium", "Medium", "30 days", "Completed run history, last-month data"],
        ["Cold", "Lower", "Higher", "90 days", "Quarterly archives, audit blobs"],
        ["Archive", "Lowest", "Highest + rehydration fee", "180 days", "Compliance retention, 7-year audit logs"]
      ]
    },
    deeper: [
      "<strong>Storage Account = top-level namespace.</strong> Blobs (files), Queues (simple tasks), Tables (NoSQL audit logs), Files (SMB shares for legacy adapters). For integration workloads the Blob service carries most of the load.",
      "<strong>Managed Identity connection:</strong> set AzureWebJobsStorage__accountName + AzureWebJobsStorage__credential=managedidentity in Function App settings. The SDK acquires a token from the instance metadata endpoint — no key, no rotation risk, no secret in Key Vault needed.",
      "<strong>Event Hub Capture</strong> writes streaming events to Blob (Avro format) automatically on time/size windows — no code required. Combine with lifecycle policy to tier Capture files to Cool after 30 days and Archive after a year.",
      "<strong>Lifecycle policy JSON</strong> targets blob prefixes (e.g. <code>logic-apps/run-history/</code>) and applies tier-transition or delete rules based on <em>lastModified</em> or <em>lastAccessTime</em>. Always scope to specific containers — a blanket account-level rule can catch unexpected blobs.",
      "<strong>Private endpoints for Storage</strong> are mandatory when your Function App or Logic App Standard is VNet-integrated. Add the private DNS zone <code>privatelink.blob.core.windows.net</code> and link it to the VNet — otherwise the app can't resolve the storage hostname from inside the VNet.",
      "<strong>Redundancy guidance for integration:</strong> use ZRS for Logic Apps Standard storage in production (protects against AZ failure). Upgrade to GRS/GZRS if your RTO/RPO requires cross-region failover, but note that failover is manual and you must update connection strings to the secondary endpoint."
    ],
    qa: [
      {
        q: "How do you secure a Function App's connection to Storage without a connection string?",
        a: "Enable system-assigned Managed Identity on the Function App. Grant it Storage Blob Data Contributor (and Queue Data Contributor if using queues) on the storage account. In App Settings set AzureWebJobsStorage__accountName to the account name and AzureWebJobsStorage__credential=managedidentity. The Azure Functions runtime uses the DefaultAzureCredential chain to acquire a token automatically — no key, no rotation risk."
      },
      {
        q: "Why does Logic Apps Standard need a Storage Account?",
        a: "Logic Apps Standard uses Storage to persist workflow state (for stateful workflows), run history inputs/outputs, and artifact files like connection references. Without it, workflows can't survive restarts and you lose the run history audit trail. That's why storage is provisioned before deploying any Logic App Standard in our Bicep templates."
      },
      {
        q: "How do blob access tiers affect cost, and how do you choose the right one?",
        a: "Each tier trades storage cost for access cost. Hot has the highest storage price but lowest read price — good for active data you access frequently. Cool and Cold reduce storage cost but charge more per read — good for completed run histories you might need for debugging. Archive is cheapest to store but requires a rehydration step (can take hours) before you can read the blob — only appropriate for compliance retention data you almost never read. The strategy I used on the Insurance project was Hot for the current month, Cool for 30-90 days via lifecycle policy, Archive after 90 days."
      },
      {
        q: "Logic Apps run history is filling up Storage and costs are growing. How do you fix it?",
        a: "Three levers: (1) Lifecycle management policy — target the container Logic Apps writes run history to and add a tier-transition rule to move blobs older than 30 days to Cool, and delete after 90 days. (2) In the Logic App workflow settings, disable run history storage for stateless workflows — they have no checkpointing need. (3) For high-volume stateless workflows, switch them from Stateful to Stateless mode entirely — they execute in memory with no Storage writes. On the Insurance project I combined lifecycle policies with switching audit-only workflows to stateless, which cut storage costs by roughly 60%."
      },
      {
        q: "How do you lock down a Storage Account used by a Logic App Standard so it has no public internet access?",
        a: "Enable VNet integration on the Logic App Standard App Service Plan. Create a private endpoint for the Storage Account on the same VNet — this assigns a private IP to the storage service. Set the Storage Account firewall to 'Selected networks' and add only the VNet subnet. Deploy the private DNS zone privatelink.blob.core.windows.net linked to the VNet so the Logic App resolves the storage hostname to the private IP. Verify with a Kudu console nslookup — it should return a 10.x.x.x address, not a public Azure IP."
      }
    ]
  },

  {
    id: "topic6",
    num: "06",
    title: "Messaging Concepts",
    isKey: false,
    oneThing: "The number one mistake I see is assuming message delivery is exactly-once. It isn't — it's at-least-once. Every consumer must be idempotent.",
    story: "Early in the Insurance migration we had a claims processor inserting duplicate records in the database. The root cause was a lock timeout — the message was still being processed when the lock expired, so Service Bus redelivered it. We fixed it two ways: extended the lock duration beyond max processing time, and added a deduplication table in SQL keyed on MessageId. Now every message has a unique ClaimId as its MessageId and we UPSERT rather than INSERT.",
    concepts: [
      { title: "Delivery Guarantees", body: "Azure messaging services offer at-least-once delivery — a message may be delivered more than once under failure conditions (lock expiry, consumer crash, network retry). Exactly-once delivery is not guaranteed by the broker alone; idempotent consumers are the application-level solution." },
      { title: "Receive Modes", body: "Peek-Lock receives a message and holds it invisible to other consumers while you process it. You must explicitly Complete (success) or Abandon (failure). ReceiveAndDelete removes the message immediately on receipt — simpler but data loss if the consumer crashes mid-processing. Peek-Lock is the default choice for production." },
      { title: "Failure Handling", body: "MaxDeliveryCount defines how many times a message is retried before being moved to the Dead-Letter Queue. Poison messages — those that always fail regardless of retries — must be dead-lettered and inspected manually. Always alert on DLQ depth for critical queues." },
      { title: "Ordering & Fan-Out Patterns", body: "Point-to-point queues deliver each message to exactly one competing consumer. Topics with subscriptions are pub-sub — each subscription gets its own copy for independent processing. Sessions enable ordered delivery of related messages to a single consumer at a time." }
    ],
    terms: [
      ["Idempotency", "Same operation applied N times produces the same result as applying it once. Required because brokers deliver at-least-once."],
      ["DLQ", "Dead-Letter Queue — holds messages that failed MaxDeliveryCount retries or were explicitly dead-lettered. Always monitor DLQ depth."],
      ["Peek-Lock", "Receive-and-hold mode. The message stays in the queue (invisible) until the consumer Completes or Abandons it. Prevents data loss on consumer crash."],
      ["ReceiveAndDelete", "Message is deleted from the queue the moment it is received. Faster and simpler, but risks data loss if the consumer fails before processing completes."],
      ["MaxDeliveryCount", "Maximum number of times a message is redelivered before being moved to the DLQ. Default is 10. Set based on your expected transient failure rate."],
      ["Message TTL", "Time-To-Live — maximum time a message can sit in the queue. After expiry the message is dead-lettered (if dead-lettering on expiration is enabled) or deleted."],
      ["Lock Duration", "How long a Peek-Locked message stays invisible to other consumers. Must exceed your worst-case processing time or the message is redelivered before you finish."],
      ["Competing Consumers", "Multiple consumer instances all reading from the same queue — each message goes to exactly one consumer. Horizontal scale-out pattern for throughput."]
    ],
    comparison: {
      title: "Queue vs Topic/Subscription vs Event Hub",
      headers: ["Feature", "Queue", "Topic / Subscription", "Event Hub"],
      rows: [
        ["Delivery pattern", "Point-to-point (one consumer)", "Pub-sub (each sub gets a copy)", "Streaming log (pull-based)"],
        ["Max consumers per message", "1", "1 per subscription (unlimited subs)", "1 per partition per consumer group"],
        ["Retention", "TTL (max 14 days)", "TTL (max 14 days)", "1-90 days (configurable)"],
        ["Replay", "No", "No", "Yes — by offset or time"],
        ["Ordering", "FIFO (with sessions)", "FIFO per subscription (with sessions)", "Ordered within a partition"],
        ["DLQ", "Yes", "Yes (per subscription)", "No built-in DLQ"],
        ["Throughput", "Up to 1 GB/s (Premium)", "Up to 1 GB/s (Premium)", "Millions of events/sec"],
        ["Use case", "Reliable command processing", "Fan-out notifications", "Telemetry, log streaming"]
      ]
    },
    deeper: [
      "<strong>Queue vs Pub-Sub:</strong> queue = one consumer gets each message (competing consumers scale throughput). Topic + Subscription = every subscriber gets their own copy — use for fan-out to independent processors (e.g. claims notification AND claims audit AND claims payment, all from one published message).",
      "<strong>MaxDeliveryCount and poison messages:</strong> default is 10 retries. After the 10th failure the message moves to the DLQ with DeadLetterReason. Set an Azure Monitor alert on DLQ message count > 0 for payment or critical queues — a poison message means your consumer has a bug or a downstream system is down.",
      "<strong>Lock Duration must exceed worst-case processing time.</strong> If processing takes 90s and the lock is 60s, the message becomes visible again and gets redelivered — causing duplicate processing. Either set lock duration to 5 minutes or implement lock renewal in your consumer.",
      "<strong>Message TTL</strong> sets a maximum age for unprocessed messages. If a queue backs up and messages wait longer than TTL they expire. With dead-lettering-on-expiration enabled they move to the DLQ; without it they are silently deleted. Always enable dead-lettering on expiration for business-critical queues.",
      "<strong>ReceiveAndDelete vs Peek-Lock:</strong> ReceiveAndDelete is the right choice only when message loss is acceptable (e.g. high-frequency telemetry events where losing one sample is fine). For business transactions — claims, payments, orders — always use Peek-Lock. The extra latency from the explicit Complete call is worth the safety.",
      "<strong>Ordering guarantees:</strong> Service Bus does not guarantee FIFO ordering on a plain queue without sessions. With sessions enabled, messages with the same SessionId are delivered in FIFO order to one consumer at a time. Event Hub guarantees ordering within a partition but not across partitions. If you need global ordering you need a single partition or single session — which limits your parallelism."
    ],
    qa: [
      {
        q: "How do you implement idempotency in a Service Bus consumer?",
        a: "Three layers: (1) Enable duplicate detection on the queue with a 10-minute window — rejects messages with duplicate MessageId. (2) Application-level: store processed MessageIds in a dedup table with a unique constraint — UPSERT on business key rather than INSERT. (3) Design operations to be naturally idempotent: setting a status to Approved twice has the same result as once. Use ClaimId or OrderId as the MessageId so it carries business meaning."
      },
      {
        q: "What causes a message to go to the DLQ?",
        a: "Five causes: (1) MaxDeliveryCount exceeded — consumer failed or called Abandon() too many times. (2) Message TTL expired before processing. (3) Lock expired and MaxDeliveryCount reached. (4) Consumer explicitly dead-letters the message for data errors — wrong format, business rule violation. (5) Session lock lost. The DeadLetterReason property on the DLQ message tells you which. My production rule: alert on DLQ depth > 0 for payment queues immediately, > 10 for lower-priority queues."
      },
      {
        q: "When would you use ReceiveAndDelete instead of Peek-Lock?",
        a: "ReceiveAndDelete is appropriate only when message loss is tolerable — high-frequency telemetry or metrics where losing one event in ten thousand has no business impact. The benefit is lower latency (no round-trip for Complete) and higher throughput. For any business transaction — claims, orders, payments — always use Peek-Lock. The risk with ReceiveAndDelete is that if the consumer crashes after receiving but before finishing processing, the message is gone with no way to recover it."
      },
      {
        q: "How does message TTL work and what happens when a message expires?",
        a: "TTL is set at the queue or topic level as a default, and can be overridden per-message up to the queue maximum. When a message's age exceeds its TTL, one of two things happens: if dead-lettering-on-message-expiration is enabled (which I always enable in production), the message moves to the DLQ with DeadLetterReason=TTLExpiredException — you can inspect and replay it. If that setting is off, the message is silently deleted. In a scenario where your downstream system goes down for a few hours, TTL is what separates messages you can recover from messages that are gone forever."
      },
      {
        q: "Does Service Bus guarantee message ordering? How do you achieve it?",
        a: "On a standard queue without sessions, Service Bus does not guarantee strict FIFO ordering — concurrent consumers can process messages out of order and lock expiry can cause reordering. To guarantee ordering for a group of related messages, enable sessions on the queue and set the same SessionId on all related messages. The broker then delivers all messages for a given SessionId in FIFO order to exactly one consumer at a time. Other SessionIds are processed in parallel by other consumers. The trade-off is that a slow consumer for one session blocks all other messages in that session — set an appropriate session lock timeout."
      }
    ]
  },

  {
    id: "topic7",
    num: "07",
    title: "Azure Service Bus",
    isKey: true,
    keyNote: "★ JD priority — APIM + Service Bus is their core pattern. Know this cold.",
    oneThing: "Service Bus is where I spend most of my time — queues for point-to-point, topics for fan-out, sessions for ordered processing, and DLQ as an operational health signal.",
    story: "On the Insurance project I had APIM publish directly to a Service Bus queue using a Managed Identity send-request policy — no relay Function App needed. The APIM MI had Azure Service Bus Data Sender role on the namespace. The policy built the BrokerProperties header with MessageId set to context.RequestId and returned 202 immediately. This eliminated a whole Function App from the hot path and cut end-to-end latency by about 50ms.",
    concepts: [
      { title: "Namespace Hierarchy", body: "A Service Bus Namespace is the top-level container — it has a unique FQDN (namespace.servicebus.windows.net). Inside it you create Queues (point-to-point) and Topics (pub-sub). Topics have one or more Subscriptions, each with independent filters and its own message copy. Tiers (Basic/Standard/Premium) are set at the namespace level." },
      { title: "Message Reliability Features", body: "Service Bus provides: at-least-once delivery via Peek-Lock, duplicate detection by MessageId within a configurable window, dead-letter queues for failed messages, TTL for expiring stale messages, and message deferral for out-of-order scenarios. These features make it the right choice for reliable business transaction messaging." },
      { title: "APIM-to-Service Bus Pattern", body: "APIM can publish directly to Service Bus via a send-request policy with authentication-managed-identity. This removes a relay Function App from the hot path, reduces latency, and simplifies the architecture. APIM gets Azure Service Bus Data Sender role on the namespace. The inbound policy sets BrokerProperties (MessageId, SessionId) and returns 202 immediately." },
      { title: "Sessions & Ordered Processing", body: "Sessions group related messages for ordered delivery to a single consumer. Enable sessions on the queue and set SessionId on every message. The broker guarantees that all messages for a given SessionId are delivered in order to one active consumer — other sessions are processed in parallel. Use this for claim amendments, order state machines, or any sequence that must be processed in order." }
    ],
    terms: [
      ["Namespace / Queue / Topic / Subscription", "Namespace = container with a unique FQDN. Queue = point-to-point. Topic + Subscriptions = pub-sub fan-out. Each subscription is an independent queue view."],
      ["Session", "Groups related messages for ordered delivery to one consumer at a time. Set SessionId on messages; enable sessions on the queue or subscription."],
      ["Duplicate Detection", "Reject messages with duplicate MessageId within a configurable time window (up to 7 days). Enabled at queue/topic creation — immutable after creation."],
      ["BrokerProperties", "HTTP header used when publishing to Service Bus via REST API. Contains MessageId, SessionId, TTL, and other metadata as a JSON object."],
      ["Azure Service Bus Data Sender", "RBAC role that grants permission to send messages to a namespace, queue, or topic. Used for APIM MI and publisher Function Apps."],
      ["Azure Service Bus Data Receiver", "RBAC role that grants permission to receive, peek, and complete messages. Used for consumer Function Apps and Logic Apps."],
      ["Geo-DR", "Geo-disaster recovery — a secondary namespace in a paired region. A namespace alias abstracts the primary/secondary. Failover flips the alias; metadata is replicated but in-flight messages are not."],
      ["Premium Tier", "Dedicated compute for the Service Bus namespace. Supports 100MB messages, private endpoints, zone redundancy, and higher throughput. Required for production enterprise workloads."]
    ],
    comparison: {
      title: "Service Bus Tiers",
      headers: ["Feature", "Basic", "Standard", "Premium"],
      rows: [
        ["Queues", "Yes", "Yes", "Yes"],
        ["Topics & Subscriptions", "No", "Yes", "Yes"],
        ["Max message size", "256 KB", "256 KB", "100 MB"],
        ["Dedicated resources", "No (shared)", "No (shared)", "Yes"],
        ["Private endpoints", "No", "No", "Yes"],
        ["Zone redundancy", "No", "No", "Yes"],
        ["Geo-DR", "No", "No", "Yes"],
        ["VNet integration", "No", "No", "Yes"],
        ["Use case", "Simple queues only", "Dev/test, small workloads", "Production enterprise messaging"]
      ]
    },
    code: {
      title: "APIM: Publish to Service Bus via Managed Identity",
      body: "<!-- APIM: Publish to Service Bus via Managed Identity -->\n<inbound>\n  <set-variable name=\"body\" value=\"@(context.Request.Body.As&lt;string&gt;(preserveContent:true))\"/>\n  <send-request mode=\"new\" response-variable-name=\"sbResp\" timeout=\"15\">\n    <set-url>https://{namespace}.servicebus.windows.net/{queue}/messages</set-url>\n    <set-method>POST</set-method>\n    <set-header name=\"Content-Type\" exists-action=\"override\"><value>application/json</value></set-header>\n    <set-header name=\"BrokerProperties\" exists-action=\"override\">\n      <value>@(\"{\\\"MessageId\\\":\\\"\" + context.RequestId + \"\\\"}\")</value>\n    </set-header>\n    <authentication-managed-identity resource=\"https://servicebus.azure.net\"/>\n    <set-body>@((string)context.Variables[\"body\"])</set-body>\n  </send-request>\n  <return-response>\n    <set-status code=\"202\" reason=\"Accepted\"/>\n    <set-header name=\"x-correlation-id\" exists-action=\"override\">\n      <value>@(context.RequestId)</value>\n    </set-header>\n  </return-response>\n</inbound>"
    },
    deeper: [
      "<strong>Tiers:</strong> Basic = queues only. Standard = topics, 256 KB max message size, shared infrastructure. Premium = dedicated compute, 100 MB messages, private endpoints, zone redundancy — always use Premium for production enterprise messaging.",
      "<strong>Filters on subscriptions:</strong> SQL filter supports complex expressions on message properties (e.g. <code>PolicyType = 'Life' AND Region = 'UK'</code>). Correlation filter matches on a fixed set of properties using exact match — faster and indexed, preferred at high throughput. Use SQL filters for complex routing, Correlation filters for simple fan-out.",
      "<strong>Geo-DR:</strong> pair a primary namespace to a secondary in another region. A namespace alias abstracts the active endpoint. Failover flips the alias — your clients reconnect to the secondary automatically. Metadata (queues, topics) is replicated but in-flight messages are NOT — always drain the primary before a planned failover. Use Premium tier only.",
      "<strong>APIM Managed Identity pattern</strong> avoids a relay Function App: grant the APIM system-assigned MI the Azure Service Bus Data Sender role on the namespace. Use send-request in the inbound policy with authentication-managed-identity element — APIM fetches the OAuth token from AAD automatically. Set MessageId from context.RequestId for built-in deduplication. Return 202 with a correlation ID header — client polls a status endpoint if they need completion confirmation.",
      "<strong>Session-based ordering:</strong> enable sessions on the queue and set SessionId = business entity key (e.g. ClaimId). All messages for that ClaimId are delivered in FIFO order to one consumer at a time. Other claims are processed in parallel. The session consumer must call RenewSessionLock() if processing takes longer than the session lock timeout — otherwise another consumer steals the session.",
      "<strong>Forward to for auto-routing:</strong> a queue or subscription can have a ForwardTo property pointing to another queue or topic. Useful for building routing topologies without code — e.g. all subscriptions forward to a single audit queue. Also useful for Geo-DR active-passive: the secondary forwards to the primary while the primary is healthy."
    ],
    qa: [
      {
        q: "Walk me through APIM publishing to Service Bus using Managed Identity.",
        a: "Enable system-assigned MI on the APIM instance. Grant it Azure Service Bus Data Sender role on the Service Bus namespace. In the API operation's inbound policy: use send-request to POST to https://{ns}.servicebus.windows.net/{queue}/messages. Add authentication-managed-identity element with resource=https://servicebus.azure.net — APIM fetches the token automatically. Set BrokerProperties header with MessageId = context.RequestId for deduplication. Return 202 immediately with a correlation ID. Client polls a status endpoint if needed. This pattern removes the relay Function App from the hot path entirely.",
        code: "<!-- APIM inbound policy -->\n<send-request mode=\"new\" response-variable-name=\"sbResp\" timeout=\"15\">\n  <set-url>https://{namespace}.servicebus.windows.net/{queue}/messages</set-url>\n  <set-method>POST</set-method>\n  <set-header name=\"BrokerProperties\" exists-action=\"override\">\n    <value>@(\"{\\\"MessageId\\\":\\\"\" + context.RequestId + \"\\\"}\")</value>\n  </set-header>\n  <authentication-managed-identity resource=\"https://servicebus.azure.net\"/>\n  <set-body>@((string)context.Variables[\"body\"])</set-body>\n</send-request>"
      },
      {
        q: "When would you use Service Bus Sessions?",
        a: "When you need guaranteed ordered processing for groups of related messages. Example: a claim has an original message and then 3 amendments — all must be processed in order, by one consumer. Set SessionId=ClaimId on all 4 messages. The session-enabled queue delivers all messages for that SessionId to one consumer at a time, in order. Other consumers handle other claims in parallel. I used this on the Insurance project for claim amendment sequences where processing out of order would corrupt the claim state."
      },
      {
        q: "What are the differences between Service Bus Basic, Standard, and Premium tiers, and how do you choose?",
        a: "Basic supports queues only and runs on shared infrastructure — only appropriate for simple dev scenarios. Standard adds topics and subscriptions on shared infrastructure with 256 KB message size — usable for non-production or low-volume workloads. Premium gives you dedicated processing units, 100 MB message size, private endpoints, zone redundancy, and Geo-DR — it is the only tier suitable for production enterprise messaging. The cost difference is significant, but in any production integration platform the reliability and isolation of Premium is non-negotiable. I always deploy Premium for production and Standard for dev/test namespaces."
      },
      {
        q: "How do topic subscription filters work and when do you use SQL vs Correlation filters?",
        a: "Every subscription on a topic has a filter that determines which messages it receives. A Correlation filter matches on fixed message properties using exact string or integer equality — it is fast because it is evaluated in the broker's index. A SQL filter supports full Boolean expressions against user-defined message properties, like PolicyType = 'Life' AND Region = 'UK'. Use Correlation filters when you have simple fan-out routing — they scale to thousands of subscriptions without performance impact. Use SQL filters only when you need complex conditional routing and the subscription count is low. On the Insurance project I used Correlation filters keyed on a PolicyType user property to route Life, Health, and Property claims to separate processor subscriptions."
      },
      {
        q: "How does Service Bus Geo-DR work and what are its limitations?",
        a: "Geo-DR pairs a primary namespace to a secondary namespace in another Azure region under a shared alias FQDN. Replication is metadata-only — queues, topics, subscriptions, and their settings replicate automatically, but in-flight messages do not. In a failover, you call the failover API on the alias; clients reconnect to the secondary automatically because they use the alias endpoint, not the primary FQDN. The key limitation to communicate in an interview: messages in-flight on the primary at the time of failover are lost. For planned failovers, drain the primary queues first. For true active-active with message replication, you need the Service Bus Premium Active Replication pattern or an application-level dual-write."
      }
    ]
  },

  {
    id: "topic8",
    num: "08",
    title: "Azure Event Grid",
    isKey: false,
    oneThing: "Event Grid is for reactive notification — something happened, tell everyone who cares. It's push-based, near-real-time, and fans out to multiple handlers.",
    story: "I used Event Grid on the Insurance project to react to file uploads. Claims documents were dropped to Blob Storage by the client portal. A Storage system topic fired a BlobCreated event instantly — no polling. Event Grid delivered it to a Logic App (one subscription) and a Function App (another subscription) in parallel. The Logic App triggered a notification workflow; the Function App started the document parsing pipeline. Both ran independently. If I'd used a Blob trigger on the Function App instead, I'd have had polling latency and potential missed events at scale.",
    concepts: [
      { title: "Push-Based Event Delivery", body: "Event Grid pushes events to subscribers rather than consumers polling. Latency is typically under one second from event source to handler. This is fundamentally different from Service Bus (pull with lock) or Event Hub (pull with offset). Event Grid is designed for reactive, notification-style integration — not durable, high-volume streaming." },
      { title: "System Topics vs Custom Topics", body: "System Topics are automatically created for Azure services — Blob Storage BlobCreated/BlobDeleted, Resource Manager resource events, Service Bus active message events, etc. You just create a subscription. Custom Topics are user-managed Event Grid topics where your application publishes events. Use Custom Topics when you want to build your own event-driven architecture on Event Grid." },
      { title: "Event Schemas", body: "Event Grid supports two schemas: the native Event Grid schema (Azure-proprietary) and CloudEvents 1.0 (CNCF open standard). CloudEvents is preferred for new workloads — it is portable, tooling-friendly, and avoids lock-in to the Azure schema structure. Most Azure services now support emitting in CloudEvents format." },
      { title: "Reliability & Dead-Lettering", body: "Event Grid retries delivery with exponential backoff for up to 24 hours (18 retry attempts). Webhook endpoints must pass a validation handshake before events are delivered. Configure a dead-letter blob container on every production subscription — events that exhaust all retries are written there so nothing is silently dropped. Monitor DeadLetteredCount as an operational health signal." }
    ],
    terms: [
      ["System Topic", "An Event Grid topic automatically created by Azure for a resource type (Blob Storage, Resource Manager, Service Bus, etc.). You add subscriptions to filter and route events."],
      ["Custom Topic", "A user-managed Event Grid topic. Your application publishes events to it via HTTP POST with an access key or Managed Identity."],
      ["Event Subscription", "Routes events from a topic to a specific handler endpoint, with optional event type and subject prefix/suffix filters."],
      ["CloudEvents", "CNCF open schema standard (v1.0) for event envelopes. Preferred over the proprietary Event Grid schema for portability and interoperability."],
      ["Webhook Validation", "Before delivering events to an HTTP endpoint, Event Grid sends a validation request. The endpoint must echo back the validationCode within 30 seconds, or Event Grid will not deliver events."],
      ["Dead-Letter Destination", "A Blob Storage container configured on an event subscription. Events that fail all retry attempts are written here as JSON blobs instead of being silently dropped."],
      ["Event Domains", "A management construct for publishing events to thousands of topics under a single endpoint. Used by SaaS providers to serve multi-tenant event delivery at scale."],
      ["DeadLetteredCount", "Azure Monitor metric on an event subscription. The count of events that were dead-lettered. Alert on this in production — any dead-lettered event indicates a handler failure."]
    ],
    comparison: {
      title: "Event Grid vs Service Bus vs Event Hub",
      headers: ["Dimension", "Event Grid", "Service Bus", "Event Hub"],
      rows: [
        ["Primary purpose", "Reactive notification", "Reliable command messaging", "High-volume streaming"],
        ["Delivery model", "Push (broker pushes to handler)", "Pull (consumer polls with lock)", "Pull (consumer reads by offset)"],
        ["Retention", "Up to 24 hours retry window", "Up to 14 days (TTL)", "1–90 days (configurable)"],
        ["Replay", "No", "No", "Yes — by offset or timestamp"],
        ["DLQ / Dead-letter", "Dead-letter to blob container", "Built-in DLQ per queue/subscription", "No built-in dead-letter"],
        ["Max throughput", "~10 million events/sec", "~1 GB/sec (Premium)", "Millions of events/sec"],
        ["Typical source", "Azure resource events, blob events", "Application publishes commands", "IoT devices, telemetry, logs"],
        ["Ordering", "No guarantee", "FIFO with sessions", "Ordered within partition"]
      ]
    },
    deeper: [
      "<strong>Event Grid vs Service Bus vs Event Hub:</strong> Event Grid = reactive notification (push, no retention beyond retry window). Service Bus = reliable command messaging (DLQ, sessions, TTL, exactly-once with dedup). Event Hub = high-volume streaming with replay and consumer groups. They complement each other — Event Grid can trigger a Logic App notification AND put a message on Service Bus for the reliable processing path.",
      "<strong>Dead-lettering:</strong> configure a Storage blob container on the subscription — Events that fail all retries (up to 18 over 24h) are written there as JSON. Always configure this in production. Set a DeadLetteredCount > 0 Azure Monitor alert — a dead-lettered event means your handler is broken and events are being lost.",
      "<strong>Webhook validation handshake:</strong> Event Grid sends a POST with a validationCode in the body before activating delivery. Your endpoint must return the validationCode in the response body within 30 seconds. Azure Functions and Logic Apps handle this automatically. Custom HTTP endpoints must implement it explicitly or delivery will never start.",
      "<strong>System Topic vs Custom Topic:</strong> System Topics are auto-created by Azure for specific resource types — you just add subscriptions. Custom Topics are namespaces you own and publish to via HTTP POST. Use System Topics for reacting to Azure resource lifecycle events (blob created, resource deployed). Use Custom Topics when your application needs to publish its own domain events into an Event Grid routing layer.",
      "<strong>Event filtering on subscriptions:</strong> filter by event type (e.g. Microsoft.Storage.BlobCreated), subject prefix (e.g. /blobServices/default/containers/claims/), or advanced filters on event data properties. Filtering happens at the broker — handlers only receive events that match. This avoids unnecessary invocations of expensive handlers.",
      "<strong>Managed Identity for publishing to Custom Topics:</strong> grant the publisher MI the EventGrid Data Sender role on the Custom Topic. Use DefaultAzureCredential in code — no topic access keys needed. For system topics, Event Grid authenticates internally — you only configure the subscription handler's identity."
    ],
    qa: [
      {
        q: "When do you choose Event Grid over Service Bus?",
        a: "Event Grid for notification — something happened, react to it, multiple handlers can respond. Service Bus for reliable command messaging — do this thing, guarantee delivery, support retries and DLQ. Practical rule: if I'm saying a blob was created or a resource was deployed, that's Event Grid. If I'm saying process this claim or charge this payment, that's Service Bus. They often work together — Event Grid triggers a Logic App notification and also puts a message on a Service Bus queue for the reliable processing path."
      },
      {
        q: "How does Event Grid ensure reliability?",
        a: "It retries delivery with exponential backoff for up to 24 hours, up to 18 retry attempts. It validates webhook endpoints before delivering events. Configure a dead-letter blob container on every production subscription — events that exhaust all retries are written there so nothing is silently dropped. Set an Azure Monitor alert on the DeadLetteredCount metric on your subscriptions — any dead-lettered event should be investigated immediately."
      },
      {
        q: "What is the difference between a System Topic and a Custom Topic, and when would you use each?",
        a: "A System Topic is automatically provisioned by Azure for a specific resource — for example, creating a Storage Account also makes a BlobStorage system topic available. You just add event subscriptions to it. A Custom Topic is a user-owned Event Grid namespace that you publish events to via HTTP POST from your own application. Use System Topics when you want to react to Azure platform events: a blob was uploaded, a resource was created, a Service Bus queue has active messages. Use Custom Topics when you want to publish your own application domain events — for example, a ClaimSubmitted event that fans out to a notification service, an audit logger, and a downstream processor."
      },
      {
        q: "How does webhook validation work and what do you need to implement in a custom endpoint?",
        a: "When you create an event subscription pointing to an HTTP webhook, Event Grid first sends a validation POST to that endpoint with a body containing a validationCode field. Your endpoint must return a 200 response with a JSON body containing that same validationCode within 30 seconds. If it does not, Event Grid marks the subscription as inactive and stops trying. Azure Functions with the Event Grid trigger and Logic Apps with the Event Grid connector handle this handshake automatically. For any custom REST endpoint you build, you must check if the incoming request is a SubscriptionValidation event type and return the code before processing the actual events."
      },
      {
        q: "How would you configure dead-lettering for an Event Grid subscription and what do you monitor?",
        a: "In the event subscription definition, set the dead-letter destination to a Storage blob container — specify the storage account resource ID and container name. Events that fail all delivery retries are written to that container as JSON files with the path format: topic/subscription/year/month/day/hour/minute/eventId.json. The blob includes the original event payload plus metadata like the DeadLetterReason and DeadLetterErrorMessage. In Azure Monitor, create an alert rule on the DeadLetteredCount metric for the subscription with threshold > 0 — especially for subscriptions that trigger payment or claim processing workflows. On the Insurance project I paired this with a Logic App that read from the dead-letter container on a schedule, parsed the reason, and created an incident ticket for any dead-lettered claim event."
      }
    ]
  },

{
    id: "topic9",
    num: "09",
    title: "Azure Event Hub",
    isKey: false,
    oneThing: "Event Hub is a distributed log for high-volume streaming — millions of events per second, multiple independent readers, and crucially: replay. Unlike Service Bus, consuming a message doesn't delete it.",
    story: "I haven't used Event Hub as heavily as Service Bus in the Insurance project — that was predominantly message-driven. But I've designed an Event Hub architecture for telemetry ingestion where partitions mapped to consumer parallelism: 16 partitions meant max 16 parallel Function App instances per consumer group. The key design decision was the partition key — using the policy ID meant all events for one policy always landed in the same partition, preserving order for that entity without needing sessions.",
    concepts: [
      { title: "Partition-based parallelism", body: "Events are distributed across partitions by partition key. Each partition is an ordered, append-only log. Max parallel consumers per consumer group equals the partition count — set this before you go live, it cannot be changed on Standard tier." },
      { title: "Consumer groups for independent readers", body: "Each consumer group has its own offset pointer into the stream. A metrics pipeline and an archival pipeline can both read the same stream independently without interfering — both see every event." },
      { title: "Retention and replay", body: "Events are retained for 1–7 days (Standard) or up to 90 days (Premium/Dedicated). Any consumer can rewind to any offset — replay lets you reprocess a bad batch without republishing the source data." },
      { title: "Capture for durable archival", body: "Event Hub Capture automatically writes events to Azure Blob Storage or ADLS Gen2 in Avro format on a time or size window. Zero code. Use it when downstream analytics tools need a persistent, queryable lake." }
    ],
    terms: [
      ["Partition", "Ordered, append-only event sequence — the unit of parallelism. Partition count is immutable on Standard tier after namespace creation."],
      ["Consumer Group", "Named independent view of the stream with its own checkpoint offset. Multiple consumer groups can read the same data without interference."],
      ["Offset / Checkpoint", "Position of the last successfully processed event in a partition. Consumers save checkpoints to storage so they can resume after failure without reprocessing."],
      ["Capture", "Built-in feature that auto-archives events to Blob Storage or ADLS Gen2 in Avro format on a configured time or size window."],
      ["Throughput Unit (TU)", "Standard tier billing unit: 1 TU = 1 MB/s ingress, 2 MB/s egress. Auto-inflate scales TUs automatically up to a configured max."],
      ["Processing Unit (PU)", "Premium tier compute unit — replaces TUs. Dedicated resources, no noisy-neighbour, supports up to 90-day retention."],
      ["Event Retention", "How long events remain readable. Standard: 1–7 days. Premium/Dedicated: up to 90 days. After retention, events are permanently deleted."],
      ["Kafka Endpoint", "Event Hub exposes a Kafka-compatible protocol endpoint. Kafka producers/consumers connect using their existing Kafka client libraries with no code change — only the bootstrap server changes."]
    ],
    comparison: {
      title: "Event Hub vs Service Bus vs Event Grid",
      headers: ["Aspect", "Event Hub", "Service Bus", "Event Grid"],
      rows: [
        ["Primary use case", "High-volume telemetry / streaming logs", "Reliable application message passing", "Event routing / reactive triggers"],
        ["Consumption model", "Pull — consumer holds offset, can replay", "Push/pull — message deleted on Complete", "Push — Event Grid delivers to subscriber"],
        ["Max throughput", "Millions of events/sec (scale-out)", "Thousands of messages/sec per entity", "10M events/sec (per namespace)"],
        ["Message ordering", "Ordered within a partition by key", "Ordered within a session by SessionId", "No ordering guarantee"],
        ["Replay", "Yes — within retention window", "No — consumed messages are gone", "No"],
        ["Max message size", "1 MB (Standard), 1 MB (Premium)", "256 KB (Standard), 100 MB (Premium)", "1 MB"],
        ["Competing consumers", "Max one per partition per consumer group", "Unlimited competing consumers per queue", "N/A — event routing, not queuing"],
        ["When to choose", "IoT telemetry, clickstream, log ingestion", "Order processing, workflow triggers", "Blob created → trigger function, low-vol events"]
      ]
    },
    deeper: [
      "<strong>Partition count is immutable</strong> on Standard tier — once the namespace is created, you cannot add partitions without creating a new Event Hub. Size for peak parallelism from day one: partitions = max desired parallel consumer instances.",
      "<strong>Kafka compatibility endpoint:</strong> Event Hub exposes a Kafka-protocol endpoint. Existing Kafka producers and consumers connect by changing only the bootstrap server address. No Kafka cluster to manage — same SLA and scaling as Event Hub.",
      "<strong>Consumer group isolation:</strong> each consumer group maintains its own offset checkpoint independently. A slow analytics pipeline cannot block a real-time alerting pipeline — they both read the same partitions at their own pace.",
      "<strong>Auto-inflate (Standard tier):</strong> configure a max TU ceiling and enable auto-inflate. Throughput Units scale up automatically under load without manual intervention — scale-down is manual.",
      "<strong>Event Hub Capture vs manual archiving:</strong> Capture writes Avro files to Blob/ADLS on a time (e.g., every 5 min) or size (e.g., every 300 MB) window, whichever comes first. Avro is schema-embedded — downstream Spark or Synapse jobs can read without a separate schema registry.",
      "<strong>Partition key choice</strong> is the most important design decision: same key → same partition → ordered delivery for that entity. Use a business entity ID (policy ID, device ID) as partition key when per-entity ordering matters. Null key = round-robin across partitions (max throughput, no ordering)."
    ],
    qa: [
      {
        q: "How do partitions affect parallelism in Event Hub?",
        a: "Each partition is an independent, ordered log. Within one consumer group, only one consumer instance can read a given partition at a time. So max parallelism equals partition count. If you have 16 partitions and spin up 32 Function App instances in one consumer group, 16 of them sit idle. Set partition count at creation based on your peak desired parallelism — it cannot be changed on Standard tier without recreating the Event Hub."
      },
      {
        q: "When would you use Event Hub Capture?",
        a: "When you need a durable, queryable archive of every event without writing any code. Capture writes Avro files to Blob Storage or ADLS Gen2 on configurable time or size windows. The Avro files are immediately queryable by Synapse Analytics or Azure Databricks. I use it alongside real-time processing: the stream consumers handle live alerting while Capture feeds the data lake for historical analytics — both happen in parallel from the same Event Hub."
      },
      {
        q: "How would you handle multiple independent teams consuming the same event stream?",
        a: "Create a dedicated consumer group per team or per pipeline. Each consumer group has its own offset pointer and checkpoint storage, so the teams are completely isolated — one team's slow processing or failure does not affect another's offset. The source events are never deleted by consumption; they expire only after the retention window. This is the fundamental difference from Service Bus: Event Hub is a shared log, not a queue."
      },
      {
        q: "When would you choose Event Hub over Service Bus?",
        a: "Event Hub when: volume is very high (hundreds of thousands to millions of events per second), you need replay capability, you have multiple independent consumers reading the same data, or the data is telemetry or logs rather than business commands. Service Bus when: you need guaranteed at-least-once delivery with message lock, sessions for ordered per-entity processing, dead-lettering, or message-level TTL and deduplication. The Insurance project used Service Bus for claims processing (reliable delivery, ordering via sessions) and I designed Event Hub for telemetry ingestion (high volume, multiple consumers)."
      },
      {
        q: "What are Throughput Units and how do you handle unexpected traffic spikes?",
        a: "On Standard tier, one Throughput Unit gives 1 MB/s ingress and 2 MB/s egress. You pre-purchase TUs and are throttled if you exceed them. To handle spikes, enable Auto-inflate: set a maximum TU ceiling and Event Hub scales TUs up automatically when throughput approaches the limit. Scale-down is manual. On Premium tier, Processing Units replace TUs and give dedicated compute resources with no noisy-neighbour throttling — better for predictable enterprise workloads. Monitor the IncomingBytes and ThrottledRequests metrics in Azure Monitor to detect when you are approaching TU limits."
      }
    ]
  },

  {
    id: "topic10",
    num: "10",
    title: "Logic Apps",
    isKey: false,
    oneThing: "Logic Apps Standard is my primary tool — I've replaced 23 BizTalk orchestrations with Logic App workflows. The key decision is always Consumption vs Standard: for enterprise work with VNet, multi-workflow, and local dev, it's Standard every time.",
    story: "On the Insurance project, we migrated BizTalk orchestrations to Logic Apps Standard. The mental model shift was: BizTalk orchestrations are code with shapes; Logic Apps are designer-first JSON workflows. The translation: receive location → Service Bus trigger, orchestration logic → workflow actions, XSLT maps → built-in XSLT transform action using Integration Account maps, exception handling → Scope + Run After configured to catch Failed + TimedOut. I ran both BizTalk and Logic Apps in parallel for 6 weeks doing semantic output comparison before each cutover.",
    concepts: [
      { title: "Stateful vs Stateless workflows", body: "Stateful persists every action's input and output to Storage — full run history, replayable, slower. Stateless keeps state in memory only — faster, no run history stored, no replayability. Use stateful for auditable business processes, stateless for high-throughput low-latency transformation pipelines." },
      { title: "Consumption vs Standard hosting", body: "Consumption is single-workflow, shared multi-tenant, scales to zero, pay-per-execution. Standard is multi-workflow, single-tenant, supports VNet integration and private endpoints, always-warm options, and local development with VS Code — the right choice for enterprise integration with compliance requirements." },
      { title: "Run After for error handling", body: "Every action has Run After settings: run when the previous step is Succeeded, Failed, TimedOut, or Skipped. Scope a group of actions, then configure a parallel error-handling branch to run after the Scope is Failed or TimedOut. This is the Logic Apps equivalent of a try-catch block." },
      { title: "Built-in vs Managed connectors", body: "Built-in connectors run in-process inside the Logic Apps runtime — lower latency, no extra cost, support private endpoints (e.g., built-in Service Bus, HTTP, SQL). Managed connectors are hosted by Microsoft in a shared connector infrastructure — additional cost per execution, connect to SaaS APIs. Always prefer built-in for performance-sensitive or VNet-isolated workloads." }
    ],
    terms: [
      ["Stateful Workflow", "Persists every action input and output to Storage. Provides full run history and replay capability. Survives restarts. Required for auditable business processes."],
      ["Stateless Workflow", "Keeps state in memory only. No run history stored. Faster and cheaper but no replayability. Best for high-throughput transformation pipelines."],
      ["Built-in Connector", "Runs in-process inside the Logic Apps Standard runtime. Lower latency, no per-execution connector cost, supports VNet and private endpoints."],
      ["Managed Connector", "Hosted by Microsoft in shared connector infrastructure outside the Logic Apps runtime. Additional per-execution cost. Used for SaaS integrations (Salesforce, SAP, etc.)."],
      ["Run After", "Per-action setting controlling when an action executes based on the outcome of the prior step: Succeeded, Failed, TimedOut, or Skipped. Enables try-catch-style error branching."],
      ["Scope", "A container action that groups child actions. Configure Run After on a subsequent action to trigger when the Scope itself fails or times out — the Logic Apps error handling pattern."],
      ["Integration Account", "Azure resource that holds shared integration artifacts: XSLT maps, XSD schemas, AS2 agreements, EDIFACT configs. Linked to a Logic App to make maps available to Transform XML actions."],
      ["Trigger", "The event that starts a workflow. Examples: Service Bus message received, HTTP request, recurrence timer, Blob created. Logic Apps Standard supports multiple triggers per workflow file."]
    ],
    comparison: {
      title: "Consumption vs Standard",
      headers: ["Feature", "Consumption", "Standard"],
      rows: [
        ["Hosting model", "Multi-tenant shared", "Single-tenant dedicated"],
        ["Workflows per app", "One workflow per Logic App resource", "Multiple workflows per Logic App resource"],
        ["VNet integration", "Not supported", "Supported — private endpoints, VNet injection"],
        ["Local development", "Designer in portal only", "VS Code extension with local run and debug"],
        ["Pricing model", "Per action execution", "App Service Plan or Workflow Standard plan (per hour)"],
        ["Scaling", "Scale to zero automatically", "Always-warm option; configurable scale-out"],
        ["Stateful / Stateless", "Stateful only", "Both stateful and stateless workflows"],
        ["Built-in connectors", "Limited", "Full set including Service Bus, SQL, HTTP, SFTP"],
        ["Best for", "Simple automation, low volume, quick prototyping", "Enterprise integration, compliance, VNet, BizTalk migration"]
      ]
    },
    deeper: [
      "<strong>BizTalk to Logic Apps translation:</strong> Receive Location → Service Bus trigger. Orchestration shapes → workflow actions. XSLT Maps → Transform XML action backed by Integration Account. Exception handling blocks → Scope + Run After (Failed, TimedOut). Pipeline components → inline expression or linked Function App.",
      "<strong>Consumption vs Standard — the decision:</strong> use Standard when you need VNet integration (private endpoints to Service Bus, SQL, Storage), multiple workflows sharing maps and connections, local debugging in VS Code, or predictable cost at high volume. Consumption for simple event-driven automation with unpredictable, low-volume traffic.",
      "<strong>Error handling pattern — Scope + Run After:</strong> wrap the happy path in a Scope action. Add a parallel branch (Terminate or compensation actions) configured with Run After = Scope → Failed, TimedOut. This mirrors try-catch and cleanly separates business logic from error recovery.",
      "<strong>Expressions:</strong> @{triggerBody()} accesses the trigger payload. ?[] is the null-safe array operator — @{triggerBody()?['claimId']} returns null instead of throwing if claimId is absent. @{variables('myVar')} reads a variable. @{utcNow()} for timestamps. These are C#-style expressions evaluated at runtime.",
      "<strong>Managed Identity for connectors:</strong> Logic Apps Standard supports system-assigned and user-assigned Managed Identity. Configure Service Bus, Storage, and SQL connections to use MI rather than connection strings. In Bicep, assign the MI the correct role (e.g., Azure Service Bus Data Sender) on the target resource.",
      "<strong>Parallel execution and concurrency:</strong> the For Each loop runs iterations in parallel by default (max 20 concurrent). Set Concurrency Control → Degree of Parallelism = 1 to force sequential processing when order matters, or increase above 20 for high-throughput batch scenarios."
    ],
    qa: [
      {
        q: "How do you handle errors in a Logic App workflow?",
        a: "Scope + Run After. I wrap the main business logic in a Scope action. I add a parallel branch with compensation or alerting actions and set their Run After to execute when the Scope has Failed or TimedOut. Inside the error branch I send a message to a dead-letter Service Bus queue, write the failed payload to Blob Storage, and post a structured alert to Application Insights. This cleanly separates happy path from error handling and means the error branch always runs regardless of which action inside the Scope failed."
      },
      {
        q: "What replaced what when you migrated BizTalk to Logic Apps?",
        a: "Receive Locations became Service Bus triggers. Orchestration shapes became workflow actions in sequence. XSLT Maps moved to Integration Account and are invoked with the Transform XML built-in action. Pipeline components (parsing, validation, custom functoids) became either Logic App expressions or Azure Functions called inline. Exception handling in orchestrations became Scope plus Run After. The BizTalk BAM (Business Activity Monitoring) tracking equivalent is Tracked Properties in Logic Apps, which emit custom dimensions to Application Insights."
      },
      {
        q: "How do you decide between Consumption and Standard Logic Apps?",
        a: "Standard every time for enterprise work: VNet integration is non-negotiable when Service Bus, SQL, and Storage all have private endpoints. Standard also lets me run multiple workflows in one resource (sharing maps, connections, and a single Managed Identity), debug locally in VS Code before deploying, and use stateless workflows for high-throughput pipelines. Consumption is fine for simple webhook automation or prototyping where VNet is not needed and volume is low and unpredictable — pay-per-execution pricing wins there."
      },
      {
        q: "When would you choose a stateless vs stateful Logic App workflow?",
        a: "Stateful for any auditable business process: claims processing, policy updates, anything where I need the full run history in the portal, the ability to re-run a failed instance from a specific action, and a durable record of every input and output. Stateless for high-throughput low-latency pipelines — telemetry transformation, enrichment of events — where I do not need history and want the speed of in-memory execution. On the Insurance project, all claim workflows are stateful. Any internal metric forwarding workflows are stateless."
      },
      {
        q: "What is the cost difference between built-in and managed connectors, and why does it matter?",
        a: "Built-in connectors (Service Bus, HTTP, SQL, Storage) run inside the Logic Apps Standard runtime and are included in the plan cost — zero additional per-execution charge. Managed connectors are hosted externally and charged per execution call. At high volume — thousands of workflow executions per hour — managed connector calls add up significantly. On the Insurance project I explicitly replaced managed Service Bus and SQL connectors with their built-in equivalents during the Standard migration, which also resolved the VNet connectivity issue because built-in connectors honour the VNet injection of the Logic Apps Standard plan."
      }
    ]
  },

  {
    id: "topic11",
    num: "11",
    title: "Logic Apps Advanced Patterns",
    isKey: false,
    oneThing: "The patterns that come up most: canonical model for multi-source integration, scope-based error handling with compensation, and tracked properties for end-to-end traceability in App Insights.",
    story: "On the Insurance project we had 5 source systems with different schemas — policy, claims, billing, reinsurance, portal. Rather than 25 point-to-point maps, I introduced a canonical ClaimEvent model. Each source had one inbound XSLT map (source → canonical). Each target had one outbound map (canonical → target). 10 maps total. When we added a 6th source system, we wrote one new map rather than 5. That's a direct EIP Content-Based Router + Canonical pattern.",
    concepts: [
      { title: "Canonical model to control map explosion", body: "With N sources and M targets, point-to-point mapping requires N*M maps. Introducing a canonical intermediary format reduces this to N+M maps. Each source has one inbound map, each target has one outbound map. Adding a new source requires only one new inbound map, not one per target." },
      { title: "Scope-based error handling with compensation", body: "Wrap the happy path in a Scope. Add a parallel error branch that runs when the Scope fails or times out. The error branch can compensate: undo completed steps (e.g., cancel a reservation), send an alert message, write the failed payload to a dead-letter blob, and terminate cleanly. This is the Logic Apps equivalent of a distributed transaction rollback." },
      { title: "Tracked Properties for end-to-end tracing", body: "Logic Apps Standard can emit custom dimensions to Application Insights via Tracked Properties. Set business identifiers (ClaimId, PolicyNumber, CorrelationId) as tracked properties on key actions. All runs for a given ClaimId are then queryable with a single KQL query across multiple workflows and even across linked Function Apps." },
      { title: "Concurrency and throughput control", body: "The For Each loop defaults to 20 parallel iterations. The trigger concurrency setting controls how many workflow instances run simultaneously. Tuning both is essential: too high causes downstream throttling on Service Bus or SQL; too low creates backlogs. Set Split On to fan out a batch trigger into individual instances rather than looping inside one workflow." }
    ],
    terms: [
      ["Canonical Model", "A common intermediary message format that all source and target systems map to and from. Reduces N*M point-to-point maps to N+M maps."],
      ["Tracked Properties", "Custom key-value dimensions emitted from a Logic App action to Application Insights. Enable cross-workflow and cross-resource tracing by business identifier."],
      ["Integration Account", "Azure resource holding shared integration artifacts: XSLT maps, XSD schemas, AS2/EDIFACT agreements. Linked to Logic Apps Standard to share maps across workflows."],
      ["Chunking", "Logic Apps pattern for handling large messages (above 100 MB) by splitting them into smaller chunks, processing each chunk independently, and reassembling. Configured per action."],
      ["Concurrency Control", "Setting on triggers and For Each loops that limits the number of simultaneously running instances or iterations. Prevents overwhelming downstream systems."],
      ["Split On", "Trigger setting that debatches an array payload — each array element triggers a separate workflow instance rather than one instance receiving the whole array. Enables parallel fan-out at the trigger level."],
      ["Content-Based Router (EIP)", "Enterprise Integration Pattern: inspect message content and route to different downstream targets based on field values. Implemented in Logic Apps with Switch or Condition actions."],
      ["Re-run (Stateful)", "Stateful workflows store every action input/output. A failed run can be re-run from any action in the portal or via the Logic Apps REST API, replaying stored inputs without re-triggering the source."]
    ],
    deeper: [
      "<strong>Canonical model — the map count argument:</strong> 5 sources × 5 targets = 25 point-to-point maps. With a canonical model: 5 inbound + 5 outbound = 10 maps. Adding a 6th source = 1 new inbound map, not 5. This was the justification I used with stakeholders to fund the Integration Account and the upfront canonical design work.",
      "<strong>Chunking for large messages:</strong> Logic Apps HTTP and Service Bus actions have a default 100 MB message limit. Enable chunking in the action settings to split large payloads into sequential byte-range requests automatically. The receiving end must also support range requests. For file processing above 100 MB I use Blob Storage as the transfer medium and pass only a SAS URL in the message.",
      "<strong>Concurrency control — two places to set it:</strong> (1) Trigger concurrency limits simultaneously running workflow instances (default unlimited). (2) For Each loop Degree of Parallelism limits concurrent iterations (default 20, max 50). Set trigger concurrency to match downstream system's max throughput. Set For Each parallelism to 1 for ordered processing.",
      "<strong>Re-running a failed stateful workflow:</strong> in the portal, open the failed run, select the action to re-run from, and click Re-run. The workflow replays stored inputs from that action forward without hitting the trigger again. Via API: POST to /runs/{runId}/actions/{actionName}/listExpressionTraces then POST to resubmit. Invaluable during an incident — fix the downstream system and replay without data loss.",
      "<strong>Tracked Properties KQL query pattern:</strong> in Application Insights, tracked properties appear as customDimensions fields. Query: requests | where customDimensions.ClaimId == '12345' | project timestamp, name, customDimensions. Join across Function App traces: union requests, traces | where customDimensions.CorrelationId == @correlationId. This gives a full end-to-end timeline across Logic Apps and Functions.",
      "<strong>XSLT in Logic Apps vs BizTalk:</strong> Logic Apps calls XSLT 1.0 (not 2.0 or 3.0) maps stored in Integration Account. Complex BizTalk maps using functoids that have no XSLT equivalent (database lookups, scripting functoids) must be replaced with a Function App call that returns the transformed XML, then passed to the next action. This is a common migration blocker — audit functoid types early."
    ],
    qa: [
      {
        q: "How did you implement end-to-end tracing across Logic App runs?",
        a: "Three layers. First, a CorrelationId is generated at the API entry point (APIM sets x-correlation-id from context.RequestId) and propagated as a message property through every Service Bus hop. Second, every Logic App workflow reads the CorrelationId from the trigger and sets it as a Tracked Property on a key action — this emits it as a customDimension to Application Insights. Third, Function Apps called by Logic Apps receive the CorrelationId in the message body and set it on their ILogger scope so all their traces carry the same dimension. In Application Insights I can run a union query across requests and traces filtered by CorrelationId and get the full end-to-end timeline across multiple workflows and functions."
      },
      {
        q: "What's the difference between stateful and stateless Logic App workflows?",
        a: "Stateful persists every action's input and output to Azure Storage after each step. This gives full run history visible in the portal, the ability to re-run from any failed action, and durability across restarts. The cost is latency — each step involves a Storage write. Stateless keeps all state in memory only. No run history is stored, you cannot re-run, and if the instance crashes mid-execution the state is lost. Stateless is significantly faster and has no per-step Storage I/O. On the Insurance project: all claim processing workflows are stateful for auditability. Internal metric forwarding workflows are stateless because speed matters and we do not need history."
      },
      {
        q: "Why use a canonical model instead of point-to-point maps?",
        a: "With N source systems and M target systems, point-to-point mapping requires N times M maps — each pair needs its own transformation. With a canonical model you write N inbound maps (source to canonical) and M outbound maps (canonical to target): N plus M total. On the Insurance project that was 5 sources and 5 targets: 25 maps point-to-point vs 10 with canonical. When we added a 6th source, we wrote 1 new inbound map instead of 5. The canonical model also improves testability — you can validate each map independently against the canonical schema rather than against every target schema."
      },
      {
        q: "How do you control concurrency in Logic Apps to avoid overwhelming a downstream system?",
        a: "Two settings. First, trigger concurrency: in the workflow settings, enable Concurrency Control on the trigger and set a max degree of parallelism — this limits how many workflow instances run simultaneously. If the downstream SQL Server handles 10 concurrent connections safely, set trigger concurrency to 10. Second, For Each loop parallelism: inside a workflow, the loop defaults to 20 parallel iterations. Set it to 1 for sequential (ordered) processing, or tune it to match what the downstream system can absorb. I also use Split On on batch triggers to debatch arrays into individual workflow instances rather than looping inside one instance — this distributes load better and gives each item its own run history."
      },
      {
        q: "How do you re-run a failed Logic App workflow without re-triggering the source?",
        a: "Only stateful workflows support re-run — this is one of the key reasons I use stateful for all business-critical flows. In the portal: open the failed run in the run history, identify the failed action, and click Re-run from this action. The workflow replays using the stored inputs from that action forward — the trigger is not re-invoked and the source system is not called again. Programmatically, use the Logic Apps REST API to post a resubmit request against the specific run ID. The typical incident workflow: fix the downstream issue (database offline, service unavailable), then bulk re-run all failed instances using the Azure CLI or a script against the run history API."
      }
    ]
  },

  {
    id: "topic12",
    num: "12",
    title: "Azure Functions",
    isKey: false,
    oneThing: "Functions are my transformation layer — stateless, event-triggered, no server management. I use them where Logic Apps is too heavy: data parsing, custom functoid replacements, AI API calls.",
    story: "I used Azure Function Apps on the Insurance project as the transformation layer that replaced BizTalk pipeline components. A Service Bus trigger on the Function received a raw claims payload, validated it against an XSD schema, transformed it to the canonical format using a .NET XSLT transform, and output-bound to a second Service Bus queue. The whole thing was on Premium plan for VNet integration — the Function needed to reach both the Service Bus private endpoint and a SQL Server private endpoint for a policy lookup. No public endpoints anywhere.",
    concepts: [
      { title: "Trigger and binding model", body: "A Function has exactly one trigger (what invokes it) and zero or more input/output bindings (data sources and destinations declared in configuration). Bindings eliminate boilerplate: a Service Bus output binding handles serialisation and sending without writing SDK code. The trigger, input bindings, and output bindings are all declared in function.json or as C# attributes." },
      { title: "Hosting plan determines scaling behaviour", body: "Consumption plan scales from zero to many instances automatically but has cold start latency and a 5–10 minute max execution timeout. Premium plan pre-warms instances (no cold start), supports VNet integration, and has unlimited execution duration. Dedicated (App Service) plan runs on reserved VMs — no cold start, no automatic scaling unless App Service autoscale is configured, predictable cost." },
      { title: "Durable Functions for stateful orchestration", body: "Durable Functions adds stateful, long-running orchestration to the otherwise stateless Functions model. An Orchestrator function calls Activity functions and waits for results, external events, or timers — all durably checkpointed to Storage. Use for fan-out/fan-in, human approval workflows, and sequential multi-step processes that would exceed a single function's timeout." },
      { title: "Scaling with Service Bus trigger", body: "The Service Bus trigger scales by adding one Function instance per 16 messages in the queue up to the plan maximum. maxConcurrentCalls controls how many messages one instance processes in parallel (default 16). Total parallelism = instances times maxConcurrentCalls. Tune these to match downstream system capacity — setting maxConcurrentCalls to 1 gives sequential processing within each instance." }
    ],
    terms: [
      ["Trigger", "The event that invokes the function. Exactly one per function. Examples: Service Bus message, HTTP request, Timer, Blob created, Event Hub event."],
      ["Binding", "Declarative connection to a data source or destination. Input bindings provide data to the function; output bindings send data out. Eliminate SDK boilerplate for common services."],
      ["Consumption Plan", "Serverless hosting — scales from zero, pay per execution and GB-seconds. Cold start latency on first invocation. Max 5–10 minute execution timeout. No VNet support."],
      ["Premium Plan", "Pre-warmed instances eliminate cold start. Supports VNet integration and private endpoints. Unlimited execution duration. Always-ready minimum instance count. Higher baseline cost."],
      ["Dedicated Plan (App Service)", "Functions run on a reserved App Service VM. Predictable cost, no cold start, no automatic scaling. Manual or App Service autoscale rules required."],
      ["Durable Functions", "Extension that adds stateful orchestration to Azure Functions. Orchestrator functions checkpoint state to Storage between Activity function calls, enabling long-running, reliable workflows in code."],
      ["maxConcurrentCalls", "Host.json setting for Service Bus trigger: number of messages one function instance processes concurrently. Default 16. Set to 1 for sequential processing. Total parallelism = instances × maxConcurrentCalls."],
      ["VNet Integration (Outbound)", "Premium plan feature allowing function outbound traffic to route through a VNet subnet, enabling access to private endpoints on Service Bus, SQL, Storage, and other PaaS resources without public network exposure."]
    ],
    comparison: {
      title: "Hosting Plans",
      headers: ["Feature", "Consumption", "Premium", "Dedicated (App Service)"],
      rows: [
        ["Cold start", "Yes — first invocation after idle", "No — pre-warmed instances", "No — always running"],
        ["VNet integration", "Not supported", "Yes — outbound VNet, private endpoints", "Yes — App Service VNet integration"],
        ["Max execution time", "5 minutes (default), 10 min (max)", "Unlimited", "Unlimited"],
        ["Scaling model", "Automatic from zero", "Automatic with always-ready min instances", "Manual or App Service autoscale"],
        ["Pricing model", "Per execution + GB-seconds", "Per vCPU/memory-hour + executions", "App Service Plan hourly (reserved)"],
        ["Minimum instances", "Zero (scales to zero)", "Configurable always-ready count (≥1)", "Defined by App Service Plan size"],
        ["Best for", "Unpredictable, bursty, low-volume workloads", "Enterprise integration, VNet, no cold start tolerance", "Predictable load, cost certainty, existing ASP usage"]
      ]
    },
    deeper: [
      "<strong>Cold start on Consumption plan:</strong> the first invocation after an idle period must load the Function host, your assemblies, and initialise bindings before executing. For .NET isolated worker this is typically 2–8 seconds. Mitigations: Premium plan (pre-warmed), keep-alive pings (not reliable), or move to Premium. On the Insurance project, all Functions are on Premium to eliminate cold start and support VNet.",
      "<strong>Service Bus trigger scaling:</strong> the Functions runtime checks queue depth and adds instances at a rate of one new instance per 16 messages in the queue, up to the plan maximum (200 on Consumption, configurable on Premium). maxConcurrentCalls (host.json) controls parallelism within a single instance. Set maxConcurrentCalls = 1 for sequential processing; increase it for throughput. Monitor activeMessages and deadLetterMessages in Azure Monitor to detect backlog buildup.",
      "<strong>VNet integration on Premium plan:</strong> configure regional VNet integration by assigning the Function App to a dedicated subnet (minimum /28) in your VNet. Set WEBSITE_VNET_ROUTE_ALL = 1 to route all outbound traffic through the VNet (required for private endpoint access). The Function can then reach Service Bus, SQL Server, and Storage private endpoints as if it were a VM inside the VNet — no public endpoint exposure needed.",
      "<strong>Durable fan-out/fan-in pattern:</strong> the orchestrator calls Activity.WaitAll on a list of parallel activity tasks. Each activity runs independently and concurrently. The orchestrator awaits all results before continuing. This replaces a Logic Apps For Each loop with code-level control over error handling, retry policy per activity, and aggregation logic. Use when fan-out count exceeds a few hundred items or when per-item retry logic is complex.",
      "<strong>maxConcurrentCalls tuning:</strong> default is 16. If each message processing involves a synchronous SQL call, 16 concurrent SQL connections per instance may overwhelm the database at scale. Calculate: expected_instances × maxConcurrentCalls ≤ database_max_connections. For a SQL Server with 100 max connections and up to 5 Function instances, set maxConcurrentCalls = 20. For ordered processing set it to 1.",
      "<strong>Output bindings vs explicit SDK calls:</strong> output bindings (declared in host.json / attributes) are simpler but less flexible — you set the return value or output parameter and the binding handles sending. Explicit SDK calls (instantiate ServiceBusSender in code) give full control: dynamic queue names, setting BrokerProperties like SessionId and MessageId, batching multiple messages in one transaction. For the Insurance project I use explicit SDK calls for Service Bus to control MessageId and SessionId per message."
    ],
    qa: [
      {
        q: "How does Azure Functions scale with a Service Bus trigger?",
        a: "The Functions scale controller monitors the active message count on the queue or subscription. It adds one new Function instance per 16 messages in the queue, up to the plan ceiling (200 instances on Consumption, configurable on Premium). Within each instance, maxConcurrentCalls in host.json controls how many messages are processed simultaneously — default 16. Total parallelism at peak is instances times maxConcurrentCalls. Scale-down happens when queue depth drops and idle instances are released. On Premium plan you can set a minimum always-ready instance count so the scale-in never goes to zero."
      },
      {
        q: "When would you use Durable Functions vs a Logic App?",
        a: "Durable Functions when: the orchestration requires code-level control (complex retry logic, dynamic fan-out count, aggregation logic), execution time exceeds Logic Apps action limits, the team prefers code over a designer, or you need very high throughput orchestration. Logic Apps when: the workflow involves many managed connectors (Salesforce, SAP, Office 365), non-developers need to read or maintain the workflow, you want built-in run history and designer visualisation, or the integration involves XSLT maps and Integration Account. On the Insurance project: Logic Apps for orchestration (BizTalk replacement, visible to integration team), Functions for transformation code (XSD validation, XSLT transform, policy lookup)."
      },
      {
        q: "How do you choose between Consumption, Premium, and Dedicated hosting plans?",
        a: "Consumption: unpredictable bursty workloads where cold start is acceptable, lowest cost at low volume, no VNet requirement. Premium: enterprise workloads that need VNet integration for private endpoints, cannot tolerate cold start, or have long-running executions. The always-ready instance count eliminates cold start. Dedicated: when you already have an App Service Plan with spare capacity, need predictable fixed cost, or are running Functions alongside an App Service app on the same plan. On the Insurance project everything is Premium: VNet is non-negotiable (Service Bus and SQL have no public endpoints), and cold start on claims processing triggers would be unacceptable."
      },
      {
        q: "How do you set up VNet integration on a Premium plan Function App?",
        a: "Four steps. First, create a dedicated subnet in the VNet (minimum /28, i.e., 16 addresses) with no other resources — the subnet is delegated to Microsoft.Web/serverFarms. Second, in the Function App Networking blade, configure Outbound Traffic VNet Integration and select that subnet. Third, set the app setting WEBSITE_VNET_ROUTE_ALL = 1 so all outbound traffic — including DNS — routes through the VNet rather than only RFC 1918 traffic. Fourth, verify private DNS zones are linked to the VNet for each PaaS service (privatelink.servicebus.windows.net, privatelink.database.windows.net, etc.) so the Function resolves private endpoint FQDNs to private IPs. After this the Function can reach Service Bus, SQL, and Storage private endpoints with no public network exposure."
      },
      {
        q: "How do you tune maxConcurrentCalls and what happens if it is set wrong?",
        a: "maxConcurrentCalls is set in host.json under extensions.serviceBus. It controls how many Service Bus messages one Function instance processes simultaneously. Default is 16. If it is too high: each instance opens too many concurrent connections to downstream systems (SQL, APIs), causing connection pool exhaustion, timeouts, and cascading failures. If it is too low: queue backlog builds up because you are not processing fast enough even though instances are available. To tune: measure max downstream concurrency (e.g., SQL max_connections divided by expected max instances). Set maxConcurrentCalls = floor(sql_max_connections / max_instances), leaving a safety margin. Set to 1 only when you need strictly sequential per-instance processing — for example, when the downstream system is a legacy API that cannot handle concurrent calls from the same client."
      }
    ]
  },

{
    id: "topic13",
    num: "13",
    title: "Azure API Management (APIM)",
    isKey: true,
    oneThing: "APIM is the front door to all our integrations — JWT validation, rate limiting, managed identity auth to backends, and direct Service Bus publishing. Everything that comes in from outside goes through APIM.",
    story: "The architecture on the Insurance project: internet → Application Gateway (WAF) → APIM (Internal VNet mode) → private backends. Zero public endpoints beyond the App Gateway. APIM had three critical policies: validate-jwt for Entra ID token validation checking the roles claim, rate-limit-by-key at 100 calls per minute per subscription, and for our high-volume policy event endpoint — a send-request publishing directly to Service Bus using the APIM managed identity. That last one eliminated a relay Function App and cut latency in half.",
    concepts: [
      {
        title: "Policy Engine",
        body: "Policies are XML snippets that execute at four pipeline stages: inbound (before backend), backend (modifying the forwarded request), outbound (transforming the response), and on-error. They compose to form a complete request processing chain."
      },
      {
        title: "Managed Identity Integration",
        body: "APIM supports system-assigned and user-assigned managed identities. The authentication-managed-identity policy element acquires a token for any Azure AD-protected resource at runtime — no credentials stored, no rotation work. Used to publish to Service Bus, call Key Vault, or call any RBAC-protected backend."
      },
      {
        title: "Network Modes",
        body: "APIM has three VNet modes: None (public), External (VNet-injected but gateway public-facing), and Internal (VNet-injected, gateway only accessible from inside VNet). Internal mode paired with Application Gateway is the enterprise pattern — WAF handles internet traffic, APIM handles policy, backends stay private."
      },
      {
        title: "API Versioning and Products",
        body: "APIM organises APIs into Products (subscription + quota groups). Versioning is handled via path segments (/v1, /v2), query strings (?api-version=2024-01), or headers. Version sets group related API versions and let consumers opt into upgrades without breaking existing subscriptions."
      }
    ],
    terms: [
      ["validate-jwt", "APIM inbound policy — validates a JWT Bearer token against an OpenID Connect endpoint, checking issuer, audience, and optional claims like roles"],
      ["rate-limit-by-key", "Throttle requests by any key — subscription ID, client IP, or a custom expression. Returns 429 when limit is exceeded. Use with remaining-calls-header-name to surface quota to callers."],
      ["Named Value / KV Reference", "Named Values are APIM-level key/value store. Mark a value as Key Vault reference and APIM fetches the secret automatically using its managed identity — no secret in APIM config."],
      ["send-request policy", "Makes an outbound HTTP call from inside a policy pipeline. Used to publish to Service Bus, call an enrichment API, or cache data. The response is stored in a variable for downstream policies."],
      ["authentication-managed-identity", "Policy element that acquires an Azure AD token for the specified resource using APIM's managed identity. Replaces hard-coded credentials for backend authentication."],
      ["Product", "A grouping of APIs with a shared subscription key, quota, and rate limit. Consumers subscribe to products, not individual APIs. Enables coarse-grained access control."],
      ["Backend entity", "An APIM resource representing a backend service, including URL, credentials, and circuit breaker settings. Decouples policy from backend URL — change the backend URL in one place."],
      ["Revision", "A non-breaking change to an API definition that is online but not the current version. Allows safe testing of policy changes without affecting production traffic."]
    ],
    comparison: {
      title: "APIM Tiers",
      headers: ["Feature", "Developer", "Basic", "Standard", "Premium"],
      rows: [
        ["SLA", "None", "99.95%", "99.95%", "99.99% (multi-region)"],
        ["VNet Integration", "None", "None", "None", "External or Internal"],
        ["Multi-region", "No", "No", "No", "Yes"],
        ["Scale units", "1", "2", "4", "Unlimited"],
        ["Availability Zones", "No", "No", "No", "Yes"],
        ["Use case", "Dev/Test only", "Low-volume prod", "Mid-volume prod", "Enterprise / regulated"],
        ["Approximate cost", "~$50/mo", "~$150/mo", "~$650/mo", "~$3,000/mo per unit"]
      ]
    },
    diagram: `Internet
    |
  [ App Gateway (WAF) ]   <-- Public IP, TLS termination, WAF rules
    |
  [ APIM — Internal VNet Mode ]  <-- No public IP, VNet-injected
    |              |              |
[ Functions ]  [ Logic Apps ]  [ Service Bus ]
  (VNet        (VNet            (Private
  integrated)  integrated)       Endpoint)`,
    code: {
      title: "Production APIM Policy — JWT + Rate Limit + SB Publish",
      body: `<!-- Full production policy: JWT + Rate Limit + SB Publish via MI -->
<policies>
  <inbound>
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
      <openid-config url="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"/>
      <audiences><audience>api://{app-id}</audience></audiences>
      <required-claims>
        <claim name="roles" match="any"><value>Claims.Write</value></claim>
      </required-claims>
    </validate-jwt>
    <rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Subscription.Id)"
      remaining-calls-header-name="X-RateLimit-Remaining"/>
    <send-request mode="new" response-variable-name="sbResp" timeout="15">
      <set-url>https://{ns}.servicebus.windows.net/{queue}/messages</set-url>
      <set-method>POST</set-method>
      <set-header name="Content-Type" exists-action="override"><value>application/json</value></set-header>
      <set-header name="BrokerProperties" exists-action="override">
        <value>@("{\\\"MessageId\\\":\\\"" + context.RequestId + "\\\"}")</value>
      </set-header>
      <authentication-managed-identity resource="https://servicebus.azure.net"/>
      <set-body>@(context.Request.Body.As<string>(preserveContent:true))</set-body>
    </send-request>
    <return-response>
      <set-status code="202" reason="Accepted"/>
      <set-header name="x-correlation-id" exists-action="override">
        <value>@(context.RequestId)</value>
      </set-header>
    </return-response>
  </inbound>
  <on-error>
    <set-status code="500" reason="Internal Error"/>
  </on-error>
</policies>`
    },
    deeper: [
      "<strong>Internal vs External VNet mode:</strong> Internal means the gateway endpoint has no public IP — only reachable from inside the VNet or via Application Gateway. External means the gateway is public but backends can still be private. Internal is the correct choice for regulated workloads; pair with Application Gateway for internet exposure.",
      "<strong>Policy scopes and inheritance:</strong> Policies apply at four scopes — Global (all APIs), Product, API, and Operation — from broadest to narrowest. Each scope uses &lt;base/&gt; to call the parent. Execution order: inbound runs outer-to-inner (Global first), outbound and on-error run inner-to-outer (Operation first). Omitting &lt;base/&gt; completely bypasses parent policies.",
      "<strong>Backend entity with circuit breaker:</strong> Define a Backend resource with a circuit-breaker rule — e.g., open the circuit after 5 failures in 60 seconds, stay open for 30 seconds. APIM returns 503 during the open state without hitting the backend. Pair with a retry policy on the inbound for transient faults.",
      "<strong>API versioning strategy:</strong> Use Version Sets in APIM to group v1 and v2 of the same API. Path versioning (/v1/claims) is most explicit and cacheable. Header versioning (Api-Version: 2024-01) is cleaner for clients. Never break v1 — deploy v2 as a new version and migrate callers. APIM subscriptions survive versioning.",
      "<strong>APIM tiers — when to use Premium:</strong> Developer tier has no SLA — never production. Basic and Standard lack VNet integration — unsuitable for enterprise where backends must be private. Premium unlocks Internal VNet mode, multi-region deployment, and Availability Zone support. For a regulated insurance platform, Premium is not optional.",
      "<strong>Tracing and observability:</strong> Enable Application Insights integration on the APIM instance. Every request emits a request telemetry item with duration, response code, and operation name. Add set-header name='Ocp-Apim-Trace' for on-demand tracing. Use x-correlation-id propagation (as in the policy above) to link APIM traces to downstream Function App or Service Bus traces."
    ],
    qa: [
      {
        q: "Walk me through the App Gateway + APIM Internal architecture.",
        a: "Internet traffic hits the Application Gateway, which terminates TLS and runs WAF rules. The App Gateway backend pool points to the APIM internal IP — a private address inside the Hub VNet. APIM is deployed in Internal VNet mode, meaning it has no public gateway endpoint; the only way to reach it is via the App Gateway or from inside the VNet. APIM's outbound calls go to private backends — Functions and Logic Apps via VNet integration, Service Bus and Key Vault via private endpoints. Nothing in the backend tier has a public IP. An attacker who compromises the App Gateway can reach APIM but cannot reach any data store directly."
      },
      {
        q: "How do you handle APIM policy secrets securely?",
        a: "Named Values backed by Key Vault references. APIM's system-assigned managed identity is granted Key Vault Secrets User on the vault. In the Named Value, set the value type to Key Vault and point to the secret URI. APIM fetches and caches the secret — never storing it in the APIM config. In policies, reference the named value as {{my-secret-name}}. Rotation: update the secret version in Key Vault; APIM picks up the new value within the cache TTL (default 4 hours, or trigger a manual refresh). No secret ever appears in code, ARM templates, or policy XML."
      },
      {
        q: "Explain APIM policy scopes and execution order.",
        a: "There are four policy scopes: Global (all-APIs), Product, API, and Operation. On the inbound pipeline, policies execute from outermost scope inward — Global runs first, then Product, then API, then Operation. On outbound and on-error, the order reverses — Operation runs first. The base element calls the parent scope's policy. If you omit base in an Operation policy, the API-level and above policies are completely skipped. A common pattern: put validate-jwt at the API scope (applies to all operations), put rate-limit-by-key at the Product scope (shared quota), and put endpoint-specific set-body transforms at the Operation scope."
      },
      {
        q: "How do you version APIs in APIM without breaking existing consumers?",
        a: "Create a Version Set in APIM, choosing a versioning scheme — path (/v1, /v2), query string, or header. Deploy v2 as a new API version within the set. Existing subscriptions continue to hit v1 unchanged. Add a deprecation header to v1 responses (set-header in outbound policy) to signal consumers. Set a sunset date. Once consumer traffic to v1 drops to zero, delete v1. Never change a v1 contract after it is live — add fields, never remove or rename. Revisions are for non-breaking changes to a single version (policy tweaks, documentation updates)."
      },
      {
        q: "When do you use APIM Premium tier and what does it unlock?",
        a: "Premium is required whenever you need VNet integration — specifically Internal mode for enterprise isolation. It also enables multi-region deployment (active-active across two or more Azure regions, each with independent gateway units), Availability Zone support for intra-region redundancy, and the 99.99% SLA. On a regulated insurance platform, all three are required: Internal VNet for security, Availability Zones for the SLA, and multi-region if we have a DR requirement. Developer tier is for testing policy locally — never production. Basic and Standard cover public APIs without VNet needs, acceptable for low-sensitivity workloads."
      }
    ]
  },

  {
    id: "topic14",
    num: "14",
    title: "Integration Architecture Patterns",
    isKey: false,
    oneThing: "The patterns I reach for most: Canonical Model (avoid N×M maps), Content-Based Router (Service Bus topic filters), and the async request-reply pattern (APIM returns 202, client polls a status endpoint).",
    story: "When I joined the Insurance project it had 31 point-to-point XSLT maps in BizTalk — every source connected to every target. I proposed the canonical model: define a standard ClaimEvent schema, write one map per source (source→canonical) and one per target (canonical→target). We went from 31 maps to 10. When a new source was added 6 months later, we wrote 1 map not 5.",
    concepts: [
      {
        title: "Structural Patterns",
        body: "These patterns address how data flows and transforms between systems. Canonical Data Model eliminates N×M mapping complexity. Content-Based Router directs messages to different destinations based on payload content. Aggregator collects multiple related messages and combines them before forwarding. Splitter breaks a batch message into individual items for parallel processing."
      },
      {
        title: "Reliability Patterns",
        body: "Patterns that ensure delivery and consistency under failure. Circuit Breaker stops calling a failing backend, giving it time to recover. Retry with exponential backoff handles transient faults. Saga manages distributed transactions through a sequence of local transactions with compensating actions for rollback. Dead Letter handling captures unprocessable messages for investigation."
      },
      {
        title: "Interaction Patterns",
        body: "Patterns governing how callers and services interact over time. Request-Reply is synchronous — caller waits. Async Request-Reply returns 202 immediately with a polling URL; caller checks status asynchronously. Fire-and-Forget (publish to topic) is fully async with no reply. The choice drives SLA requirements and coupling between producer and consumer."
      },
      {
        title: "Orchestration vs Choreography",
        body: "Orchestration uses a central coordinator (Logic Apps workflow, Durable Function orchestrator) that explicitly calls each step and handles errors. Choreography has no coordinator — each service reacts to events and publishes its own events. Orchestration is easier to trace and debug. Choreography scales better and is less coupled but harder to reason about for multi-step flows."
      }
    ],
    terms: [
      ["Choreography vs Orchestration", "Choreography: services react to events with no central controller. Orchestration: a central coordinator (Logic App, Durable Function) drives each step and handles errors explicitly."],
      ["Saga", "Pattern for distributed transactions: a sequence of local transactions, each publishing an event. If a step fails, compensating transactions undo prior steps. Two implementations: choreography-based (events trigger compensations) and orchestration-based (a saga orchestrator manages the sequence)."],
      ["Async Request-Reply", "Caller POSTs a request and receives 202 Accepted with a Location header pointing to a status endpoint. Caller polls the status endpoint until it returns 200 (completed) or 4xx/5xx (failed). Decouples long-running processing from the HTTP connection timeout."],
      ["Canonical Data Model", "A single, system-neutral schema that all systems map to and from. Eliminates N×M mapping complexity: N sources and M targets require only N+M maps instead of N×M point-to-point maps."],
      ["Content-Based Router", "Routes a message to one of several destinations based on the content of the message. In Azure, implemented with Service Bus topic subscription filters (SQL or correlation) or Logic App switch actions."],
      ["Aggregator", "Collects multiple related messages and combines them into a single message once all parts have arrived. Common in order fulfilment: wait for payment, inventory, and shipping confirmations before notifying the customer."],
      ["Splitter", "Decomposes a batch message into individual items for separate processing. A CSV upload event triggers a Splitter that publishes one message per row to a Service Bus queue for parallel downstream processing."],
      ["Circuit Breaker", "Monitors failure rate to a backend. Transitions from Closed (normal) to Open (stop calling, return error immediately) after a threshold. After a timeout, moves to Half-Open to test if the backend has recovered, then back to Closed or Open."]
    ],
    comparison: {
      title: "Choreography vs Orchestration",
      headers: ["Aspect", "Choreography", "Orchestration"],
      rows: [
        ["Coordinator", "None — each service is autonomous", "Central orchestrator (Logic App, Durable Function)"],
        ["Coupling", "Loose — services know only event schema", "Tighter — orchestrator knows each step"],
        ["Observability", "Hard — must trace across multiple services", "Easy — orchestrator holds full state and run history"],
        ["Error handling", "Each service handles its own errors; compensation is distributed", "Orchestrator catches errors and triggers compensations centrally"],
        ["Scalability", "High — services scale independently", "Orchestrator can become a bottleneck"],
        ["Best for", "Simple event flows, microservices with clear ownership boundaries", "Multi-step business processes with complex error handling and SLA requirements"],
        ["Azure services", "Service Bus topics, Event Grid, Event Hub", "Logic Apps, Durable Functions orchestrator"]
      ]
    },
    deeper: [
      "<strong>Use orchestration when</strong> you need a clear audit trail, complex error handling, or human approval steps. Logic Apps Standard is ideal — the run history UI shows every step, input, output, and error. Durable Functions orchestrator is the code-first equivalent. If a compliance auditor asks 'show me every step of this claim approval', orchestration gives you the answer immediately.",
      "<strong>Use choreography when</strong> services are owned by different teams with different release cadences, or when you need horizontal scale without a central bottleneck. Each service publishes events to a topic; downstream services subscribe independently. Adding a new consumer requires no change to the producer.",
      "<strong>Circuit Breaker in Azure:</strong> APIM Backend entities have built-in circuit breaker rules — configure failure threshold, sampling duration, and open duration. For Logic Apps and Durable Functions, implement using the Polly library (if .NET) or a custom retry policy with a shared state store (Redis or Table Storage) tracking failure counts.",
      "<strong>Saga pattern on Azure:</strong> Orchestration-based saga: a Durable Function orchestrator calls each step as an activity function. On failure, the orchestrator calls compensation activities in reverse order. State is durable — the orchestrator survives restarts. Choreography-based saga: each service listens for events and publishes success or failure events. A separate compensation service listens for failure events and triggers rollbacks. Orchestration-based is easier to implement correctly.",
      "<strong>Content-Based Router with Service Bus filters:</strong> Create a topic with one subscription per destination. Each subscription has a SQL filter on message properties — for example, EventType = 'ClaimApproved' or Region = 'DE'. The router publishes to the topic with the appropriate properties set; Service Bus delivers to matching subscriptions only. No routing code in the publisher.",
      "<strong>Async Request-Reply implementation:</strong> APIM receives POST, generates a correlation ID, publishes to Service Bus (via send-request policy with MI), and returns 202 with Location: /status/{correlationId}. A Function App processes the message and writes result to Table Storage keyed on correlationId. The status endpoint reads Table Storage and returns 200 with the result or 202 if still processing. This pattern handles processing times of seconds to hours without holding HTTP connections."
    ],
    qa: [
      {
        q: "How do you decide between choreography and orchestration?",
        a: "I ask three questions. First, who owns the steps? If a single team owns the whole flow, orchestration is cleaner — one place to debug. If steps are owned by separate teams and services, choreography keeps them decoupled. Second, how complex is error handling? For multi-step rollback with compensating transactions, an orchestrator is far easier to reason about than distributed compensation logic. Third, do I need an audit trail? Logic Apps run history is a built-in audit log. With choreography I have to reconstruct the flow from distributed logs. My default for integration workflows with 3+ steps is orchestration (Logic Apps). Pure event notification with no rollback requirement is choreography."
      },
      {
        q: "What is the async request-reply pattern and when do you use it?",
        a: "The caller POSTs a request and immediately receives 202 Accepted with a Location header pointing to a status endpoint. The caller polls that endpoint until it receives 200 Completed or an error. Use it whenever processing time exceeds a few seconds — insurance claim adjudication, batch file processing, external system calls with unpredictable latency. The alternative, holding an HTTP connection open, hits gateway timeouts at 30-60 seconds and wastes connection pool resources. On APIM, the send-request policy publishes to Service Bus and return-response sends the 202, all within the inbound policy — the backend Function App processes asynchronously and writes results to a status store."
      },
      {
        q: "How do you implement a Saga pattern for a multi-step insurance claim process in Azure?",
        a: "I use an orchestration-based saga with Durable Functions. The orchestrator calls activity functions in sequence: ValidateClaim, ReserveReserve, NotifyAdjuster, IssuePayment. Each activity writes to its own data store. If IssuePayment fails, the orchestrator calls compensation activities in reverse: CancelReservation, NotifyAdjusterOfFailure. Because Durable Functions state is persisted to Storage, the orchestrator survives process restarts and cloud reboots — no lost saga state. I log a correlation ID through every activity so I can reconstruct the full saga from Application Insights if needed. The alternative choreography-based saga would require each service to listen for failure events and implement its own compensation, which is error-prone and harder to test."
      },
      {
        q: "How do you implement Content-Based Routing with Service Bus topics?",
        a: "Create a Service Bus topic with one subscription per destination. For each subscription, add a SQL filter on message user properties — for example, EventType = 'PolicyCancelled' routes to the refund processing subscription, EventType = 'PolicyIssued' routes to the welcome email subscription. The publisher sets these properties when sending: ServiceBusMessage.ApplicationProperties['EventType'] = 'PolicyIssued'. The publisher has zero knowledge of who consumes the event. To add a new consumer, create a new subscription with an appropriate filter — no change to the publisher or existing consumers. Correlation filters are faster than SQL filters for simple equality matches."
      },
      {
        q: "When does a Circuit Breaker open and how do you implement it in an APIM pipeline?",
        a: "A Circuit Breaker opens when the failure rate exceeds a configured threshold within a sampling window — for example, 5 failures in 30 seconds. While open, requests fail immediately without hitting the backend, giving the backend time to recover. After an open duration (say 30 seconds), the breaker moves to Half-Open: one probe request is allowed through. If it succeeds, the breaker closes; if it fails, it reopens. In APIM, configure circuit breaker rules on the Backend entity: set failureRateThreshold, samplingDuration, and openStateSeconds. The inbound policy references the backend entity by name, so the circuit breaker applies automatically to every request through that policy. This protects the upstream from cascading failure when a downstream service is degraded."
      }
    ]
  },

  {
    id: "topic15",
    num: "15",
    title: "Azure Networking",
    isKey: false,
    oneThing: "My standard pattern for enterprise integration: Hub-and-Spoke VNet with all PaaS resources behind private endpoints. Nothing has a public IP except the Application Gateway.",
    story: "On the Insurance project: Hub VNet held APIM Internal, Azure Firewall, and the VPN Gateway for on-prem connectivity. Spoke VNet held Function Apps (VNet integrated), Logic Apps Standard (VNet integrated), and private endpoints for Service Bus, Key Vault, Storage, and SQL. All cross-spoke traffic was forced through the Azure Firewall via UDR. The result: an attacker compromising the App Gateway could reach APIM but nothing beyond it — zero lateral movement to backends.",
    concepts: [
      {
        title: "Private Connectivity",
        body: "Private Endpoints give PaaS resources a NIC with a private IP inside your VNet. DNS resolves the public FQDN (servicebus.windows.net) to the private IP, so existing SDKs work unchanged. The public endpoint can be disabled entirely. VNet Integration is the outbound complement — it lets App Service and Functions route egress traffic through a VNet subnet, enabling them to reach private endpoints and on-prem resources."
      },
      {
        title: "Hub-and-Spoke Topology",
        body: "Hub VNet contains shared services: Azure Firewall, VPN/ExpressRoute Gateway, DNS resolver, and APIM. Spoke VNets contain application workloads and are peered to the Hub. Cross-spoke traffic routes through the Hub Firewall via User-Defined Routes. This topology centralises security inspection, avoids duplicate firewall instances, and allows independent lifecycle management of each spoke."
      },
      {
        title: "Traffic Control",
        body: "NSGs (Network Security Groups) are stateful L4 firewalls attached to subnets or NICs — allow/deny by IP, port, and service tag. Azure Firewall is a stateful L4-L7 managed firewall with FQDN filtering, TLS inspection, and threat intelligence. UDRs (User-Defined Routes) override system routes, forcing traffic to a next-hop such as Azure Firewall. The combination — NSG for subnet-level allow/deny, UDR to route to Firewall, Firewall for deep inspection — is the defence-in-depth model."
      },
      {
        title: "DNS for Private Endpoints",
        body: "When a Private Endpoint is created, Azure automatically creates a DNS A record in a Private DNS Zone (e.g., privatelink.servicebus.windows.net). Link the Private DNS Zone to any VNet that needs to resolve the private IP. Resources in those VNets resolve servicebus.windows.net to the private IP; resources outside resolve to the public IP (or get blocked if public access is disabled). In Hub-and-Spoke, link all Private DNS Zones to the Hub VNet and use Azure DNS Private Resolver for on-prem DNS forwarding."
      }
    ],
    terms: [
      ["Private Endpoint", "A NIC with a private IP inside your VNet, attached to a specific PaaS resource instance. Traffic to that resource stays on the Microsoft backbone and never traverses the public internet. The public endpoint can be disabled after creation."],
      ["VNet Integration", "Outbound connectivity feature for App Service and Functions. Routes egress traffic from the app through a delegated subnet in your VNet, enabling the app to call private endpoints and on-prem resources without a public IP."],
      ["NSG", "Network Security Group — a stateful L4 firewall with allow/deny rules based on source/destination IP, port, and Azure Service Tags. Applied to subnets or individual NICs. Stateful means return traffic is automatically permitted."],
      ["UDR", "User-Defined Route — overrides Azure's default system routes. Used to force all traffic (0.0.0.0/0) to next-hop Azure Firewall, preventing spoke-to-spoke or spoke-to-internet traffic from bypassing inspection."],
      ["Azure Firewall", "Fully managed, stateful L4-L7 firewall service. Supports FQDN-based application rules, network rules, NAT rules, TLS inspection, and threat intelligence feed. Deployed in the Hub VNet as the central inspection point."],
      ["Private DNS Zone", "An Azure DNS zone hosted within Azure, not publicly accessible. Linked to one or more VNets. Used with Private Endpoints so that the public FQDN (e.g., myvault.vault.azure.net) resolves to the private IP inside the VNet."],
      ["Service Endpoint", "Extends the VNet's identity to a PaaS service's public endpoint over the Microsoft backbone. The PaaS resource can firewall access to specific VNet subnets. The resource still has a public IP — less secure than Private Endpoint."],
      ["VNet Peering", "Connects two VNets so they can route traffic to each other using private IPs. Peering is non-transitive — Spoke A peered to Hub and Spoke B peered to Hub cannot reach each other without routing through the Hub (enforced via UDR)."]
    ],
    diagram: `Hub VNet (10.0.0.0/16)
+----------------------------------------------+
| [ VPN/ExpressRoute Gateway ] (on-prem)        |
| [ Azure Firewall ]  <-- UDR next-hop          |
| [ APIM — Internal mode ]                      |
| [ Private DNS Zones linked here ]             |
+----------------------------------------------+
         |  VNet Peering (non-transitive)
         v
Spoke VNet (10.1.0.0/16)
+----------------------------------------------+
| [ Function Apps ]  -- VNet Integration --+   |
| [ Logic Apps Std ] -- VNet Integration --+   |
|                                          |   |
| Private Endpoints (private IPs):         |   |
|   [ Service Bus ]  <-------------------+|   |
|   [ Key Vault ]    <-------------------+|   |
|   [ Storage ]      <-------------------+|   |
|   [ SQL Database ] <-------------------+|   |
+----------------------------------------------+
  All PaaS public endpoints DISABLED`,
    deeper: [
      "<strong>Private Endpoint vs Service Endpoint:</strong> Private Endpoint creates a NIC with a private IP in your VNet — the resource gets a private address and public access can be fully disabled. Service Endpoint extends your subnet's identity to the public endpoint over the Microsoft backbone — the resource's IP remains public, only specific subnets are whitelisted. Private Endpoint is strictly more secure. Service Endpoint is cheaper and simpler but leaves the public endpoint reachable from anywhere (just restricted). For regulated workloads, always use Private Endpoints.",
      "<strong>Private DNS Zone configuration:</strong> Each PaaS service has a corresponding privatelink DNS zone (e.g., privatelink.servicebus.windows.net, privatelink.vaultcore.azure.net). When you create a Private Endpoint, Azure auto-creates an A record in the zone mapping the FQDN to the private IP. Link the zone to every VNet that needs to resolve it. In Hub-and-Spoke, link zones to the Hub VNet only and use Azure DNS Private Resolver to forward queries from on-prem. Verify resolution with nslookup — should return 10.x.x.x, not 52.x.x.x.",
      "<strong>APIM NSG requirements:</strong> APIM Internal mode requires specific NSG rules on the APIM subnet. Inbound: allow port 3443 from GatewayManager service tag (APIM management plane), allow port 443 from Application Gateway subnet. Outbound: allow ports 443, 80 to Internet and to specific service tags. Missing the GatewayManager rule causes APIM to become unresponsive within minutes. The Azure Firewall must also allow these flows if APIM traffic passes through it.",
      "<strong>UDR and forced tunneling:</strong> A UDR with route 0.0.0.0/0 → next-hop Azure Firewall forces all outbound traffic from a subnet through the Firewall. Apply this to every spoke subnet. The Firewall then enforces FQDN-based allow lists — for example, only allow outbound to *.servicebus.windows.net and *.vault.azure.net. This prevents a compromised Function App from calling arbitrary internet endpoints. For on-prem forced tunneling via VPN, advertise the default route from on-prem BGP.",
      "<strong>Securing Function App so only APIM can call it:</strong> Three layers: (1) VNet Integration on the Function App — egress goes through VNet. (2) Private Endpoint on the Function App — inbound allowed only from VNet. (3) NSG on the Function App's private endpoint subnet — allow source only from APIM's subnet CIDR. Result: even if someone discovers the Function App's internal URL, they cannot reach it unless they are inside the APIM subnet.",
      "<strong>Application Gateway in front of APIM:</strong> App Gateway terminates TLS, runs OWASP WAF rules, and forwards to APIM's internal private IP. Configure a custom health probe against APIM's /status-0123456789abcdef endpoint. Set the backend HTTP setting to use HTTPS with the APIM certificate. Add a rewrite rule to inject the X-Forwarded-For header so APIM sees the original client IP for rate-limiting by IP. App Gateway's public IP is the only address exposed to the internet."
    ],
    qa: [
      {
        q: "How do you secure a Function App so only APIM can call it?",
        a: "Three layers of defence. First, enable a Private Endpoint on the Function App — this gives it a private IP inside the Spoke VNet and allows you to disable the public endpoint entirely. Second, apply an NSG to the private endpoint's subnet with an inbound rule allowing source only from APIM's subnet CIDR — all other sources are denied. Third, configure VNet Integration on the Function App so its outbound traffic stays inside the VNet and can reach other private endpoints. Optionally add client certificate validation in the Function App itself as a fourth layer. The result: the only network path to the Function App is from APIM's subnet — nothing else can reach it, even from within the same VNet."
      },
      {
        q: "Explain Hub-and-Spoke topology for integration.",
        a: "Hub VNet hosts shared services: Azure Firewall for centralised traffic inspection, VPN or ExpressRoute Gateway for on-prem connectivity, DNS Private Resolver for hybrid DNS, and APIM in Internal mode. Spoke VNets host application workloads — Function Apps and Logic Apps with VNet Integration for outbound, and Private Endpoints for all PaaS dependencies (Service Bus, Key Vault, Storage, SQL). Spokes are peered to the Hub but not to each other — peering is non-transitive. All cross-spoke and spoke-to-internet traffic is forced through the Hub Firewall via UDR. The benefit: centralised security policy, no duplicate firewalls per spoke, and independent deployment lifecycles per spoke team."
      },
      {
        q: "What is the difference between Private Endpoint and Service Endpoint, and when do you choose each?",
        a: "Private Endpoint creates a NIC with a private IP in your VNet assigned to a specific PaaS resource instance. The resource's public endpoint can be disabled. DNS resolution inside the VNet returns the private IP. Service Endpoint extends the VNet subnet's identity to the PaaS service's existing public endpoint over the Microsoft backbone — the resource still has a public IP, but access can be restricted to specific VNet subnets. Choose Private Endpoint for regulated workloads where public endpoint exposure is unacceptable, for multi-region scenarios where you need resource-instance isolation, or where you need to reach the resource from on-prem via VPN without hairpinning through the public internet. Service Endpoint is acceptable for non-regulated internal tools where the cost and DNS complexity of Private Endpoints is not justified."
      },
      {
        q: "How do you configure Private DNS Zones for Private Endpoints in a Hub-and-Spoke topology?",
        a: "Each PaaS service has a corresponding privatelink zone — for example privatelink.servicebus.windows.net for Service Bus, privatelink.vaultcore.azure.net for Key Vault. When you create the Private Endpoint (via Bicep or portal), enable automatic DNS integration — Azure creates an A record in the zone mapping the FQDN to the private IP. Create all Private DNS Zones in the Hub resource group and link them to the Hub VNet. In Bicep, this is a virtualNetworkLinks resource under the zone. Spoke VNets resolve via Hub DNS because peering routes DNS queries to the linked zones. For on-prem resolution, deploy Azure DNS Private Resolver in the Hub and configure a conditional forwarder on the on-prem DNS server pointing *.privatelink.servicebus.windows.net to the resolver inbound endpoint IP. Verify with nslookup from a VM in the spoke — should return 10.x.x.x."
      },
      {
        q: "What are UDRs and how do you use forced tunneling in a Hub-and-Spoke design?",
        a: "A User-Defined Route overrides Azure's default system routes in a subnet route table. In Hub-and-Spoke, attach a route table to every spoke subnet with a single route: destination 0.0.0.0/0, next-hop type VirtualAppliance, next-hop IP = Azure Firewall's private IP in the Hub. This forces all outbound traffic — including internet-bound — through the Firewall. The Firewall's application rules then enforce an allowlist: for example, only permit HTTPS to *.servicebus.windows.net, *.vault.azure.net, and *.azurewebsites.net. All other destinations are denied and logged. For on-prem connectivity, the VPN Gateway advertises the default route over BGP to on-prem, forcing on-prem traffic through the Gateway and then through the Firewall. Note: the APIM subnet and Gateway subnet need exemptions from the default route to avoid routing loops — add specific routes for those subnets with next-hop Internet."
      }
    ]
  },

  {
    id: "topic16",
    num: "16",
    title: "Security & Governance",
    isKey: false,
    oneThing: "Zero Trust is the principle: no implicit trust, even inside the network. Every service-to-service call is authenticated. Every credential lives in Key Vault. Every action is logged.",
    story: "On the Insurance project I produced a permissions matrix documenting every service-to-service interaction with the exact RBAC role and scope. Function App → Service Bus: Azure Service Bus Data Receiver on the specific queue (not namespace-wide). Logic App → Key Vault: Key Vault Secrets User on the specific secret (not vault-wide). APIM → Service Bus: Azure Service Bus Data Sender on namespace. That matrix was reviewed in a security assessment and passed with no findings — because everything was in Bicep, peer-reviewed in PRs, not applied ad-hoc in the portal.",
    concepts: [
      {
        title: "Managed Identity and Credential-Free Auth",
        body: "System-assigned managed identity is tied to the lifecycle of a single resource — deleted when the resource is deleted. User-assigned managed identity is an independent Azure resource that can be assigned to multiple resources and persists independently. Both allow Azure services to authenticate to Azure AD-protected resources (Key Vault, Service Bus, Storage, SQL) without storing any credentials. The RBAC role assignment determines what the identity can do and at what scope."
      },
      {
        title: "RBAC Least Privilege",
        body: "Assign the narrowest built-in role at the narrowest scope. For Service Bus: Data Sender on a specific queue, not Contributor on the namespace. For Key Vault: Secrets User on a specific secret URI, not Secrets Officer on the vault. For Storage: Blob Data Reader on a specific container. Document every assignment in a permissions matrix and review it in security assessments. All RBAC assignments go through Bicep and PRs — never applied manually in the portal."
      },
      {
        title: "Key Vault Access Patterns",
        body: "Three access models for secrets at runtime: (1) Managed Identity + SDK — the app calls Key Vault directly using DefaultAzureCredential. (2) Key Vault References in App Settings — the platform (Functions, App Service) fetches the secret at startup and injects it as an environment variable. (3) APIM Named Value with KV Reference — APIM fetches and caches the secret using its MI. Pattern 1 gives the most control (fetch on demand, support rotation without restart). Pattern 2 is simplest but requires a restart to pick up rotated secrets. Never store secrets in application configuration files or ARM template parameters."
      },
      {
        title: "Policy and Governance at Scale",
        body: "Azure Policy evaluates resources against defined rules and applies effects: Deny (block non-compliant deployments), Audit (log but allow), Modify (auto-remediate), and DeployIfNotExists (deploy companion resources like diagnostic settings). Assign policies at Management Group scope to cover all subscriptions. Policy Initiatives (sets of policies) implement regulatory frameworks like ISO 27001 or CIS benchmarks. Resource Locks (CanNotDelete, ReadOnly) protect critical resources from accidental deletion — apply to production Key Vaults, Service Bus namespaces, and the Hub VNet."
      }
    ],
    terms: [
      ["Zero Trust", "Security model: never trust, always verify. Every request is authenticated and authorised regardless of network location. No implicit trust inside the perimeter. Applied through managed identity auth, RBAC, private endpoints, and conditional access policies."],
      ["Azure Policy", "Azure governance service that evaluates resources against rules and applies effects: Deny (block), Audit (log), Modify (auto-fix tags/settings), DeployIfNotExists (deploy companion resources). Assigned at Management Group, Subscription, or Resource Group scope."],
      ["PIM", "Privileged Identity Management — time-bound, approval-gated elevation of Azure AD roles. Engineers request production access, a manager approves, access is granted for a fixed window (e.g., 4 hours), and all actions are logged. Eliminates standing privileged access."],
      ["System-Assigned MI", "A managed identity whose lifecycle is bound to a single Azure resource. Automatically created and deleted with the resource. One-to-one relationship. Best for workloads with a single identity requirement — one Function App, one identity."],
      ["User-Assigned MI", "A managed identity created as an independent Azure resource. Can be assigned to multiple resources simultaneously. Persists independently of the resources it is assigned to. Best for shared identity scenarios — multiple Function Apps sharing the same Service Bus permissions, or blue/green deployments where you need the new deployment to have the same identity as the old."],
      ["Key Vault Reference", "An App Service / Function App setting whose value is a Key Vault secret URI in the format @Microsoft.KeyVault(SecretUri=...). The platform resolves the secret at startup using the app's managed identity. Secret rotation requires an app restart or a new deployment to pick up the updated value."],
      ["Resource Lock", "An Azure Resource Manager control that prevents modification (ReadOnly) or deletion (CanNotDelete) of a resource. Applied to production Key Vaults, Service Bus namespaces, and VNets to prevent accidental destructive changes even by subscription owners."],
      ["Conditional Access", "Azure AD policies that evaluate sign-in conditions (device compliance, location, user risk) and apply controls (MFA required, block access, session restrictions). Applied to APIM-facing applications to ensure only compliant devices and known locations can authenticate."]
    ],
    deeper: [
      "<strong>Key Vault best practice:</strong> Enable soft delete (90-day retention) and purge protection on all Key Vaults — once enabled, purge protection cannot be disabled and prevents permanent deletion even by admins. Enable diagnostic logging to Log Analytics. Rotate secrets on a schedule using Key Vault rotation policies with Event Grid notifications. Never put Key Vault secrets in Bicep parameter files — reference Named Values or use Key Vault References in App Settings. Apply a Resource Lock (CanNotDelete) to every production Key Vault.",
      "<strong>Azure Policy examples for integration:</strong> Deny creation of Service Bus namespaces without private endpoint (effect: Deny). Audit Function Apps that do not have HTTPS-only enabled (effect: Audit). Deploy diagnostic settings to Log Analytics for all Service Bus namespaces automatically (effect: DeployIfNotExists). Deny storage accounts with public blob access enabled (effect: Deny). Assign these as an Initiative at the Management Group level so they cover all integration subscriptions.",
      "<strong>Resource Locks in production:</strong> Apply CanNotDelete locks to Key Vaults, Service Bus namespaces, the Hub VNet, and the Log Analytics workspace. A CanNotDelete lock means even a Subscription Owner cannot delete the resource without first removing the lock — an action that generates an audit event. ReadOnly locks are more restrictive and prevent configuration changes, which can interfere with auto-scaling and managed identity operations — use sparingly.",
      "<strong>System-Assigned vs User-Assigned MI — the choice:</strong> Use system-assigned when the identity is used by exactly one resource and you want automatic lifecycle management. Use user-assigned when multiple resources need the same identity (e.g., blue/green Function App slots — both slots need the same Service Bus permissions), or when you need to pre-grant permissions before the resource is created (common in Bicep deployments where RBAC assignments must be in place before the app starts). User-assigned MI is also preferred for production workloads because it persists through resource recreation — a system-assigned MI changes on resource deletion and recreation, invalidating all RBAC assignments.",
      "<strong>PIM workflow for production access:</strong> All production RBAC roles above Reader are managed through PIM as eligible assignments — not permanent. An engineer needing to investigate a production issue opens a PIM activation request with a business justification and a maximum duration (1-4 hours). Their manager or a peer approves. PIM elevates the role for the requested duration and logs the activation. At expiry, the elevated role is automatically removed. All actions taken during the elevated window are captured in Azure Activity Log with the engineer's identity. This satisfies SOC 2 and ISO 27001 requirements for privileged access management.",
      "<strong>Key Vault access pattern comparison:</strong> For Function Apps that need secrets at startup (connection strings), use Key Vault References in App Settings — simple, no SDK changes, but requires restart on rotation. For secrets needed at runtime (signing keys fetched per request), use DefaultAzureCredential in code to call Key Vault directly — supports rotation without restart, but adds latency per call (mitigate with caching). For APIM policies that need backend credentials, use Named Values backed by Key Vault references — APIM fetches and caches with configurable TTL. Never use the legacy vault access policies model — use Azure RBAC (Key Vault Secrets User role) for all new deployments."
    ],
    qa: [
      {
        q: "How do you implement least-privilege access across an integration solution?",
        a: "I start by building a permissions matrix — a table with every service-to-service interaction, the exact built-in role, and the exact scope. The scope is always the narrowest possible: a specific queue, not the namespace; a specific secret URI, not the vault. Then I implement every assignment in Bicep using the roleAssignment resource, targeting the specific resource's resource ID as the scope. No assignments are done in the portal. All Bicep goes through PRs with a peer review checklist item for RBAC scope. In practice: Function App consuming from a Service Bus queue gets Azure Service Bus Data Receiver on that queue (not Contributor, not namespace-wide Data Owner). Logic App reading a secret gets Key Vault Secrets User assigned to the specific secret resource, not the vault. This matrix was reviewed in an external security assessment and passed with zero findings."
      },
      {
        q: "How would you enforce that all Service Bus namespaces must have private endpoints?",
        a: "Azure Policy with effect Deny, assigned at the Management Group or Subscription scope. The policy rule checks if the Service Bus namespace has at least one private endpoint connection in the Approved state. If not, the deployment is blocked at ARM. Write the policy in JSON (or use a built-in if one exists), assign it with a managed identity for DeployIfNotExists effects, and exclude the Dev subscription if needed. Additionally, add a companion policy with effect DeployIfNotExists to automatically deploy the diagnostic settings to Log Analytics whenever a Service Bus namespace is created. Test in audit mode first to identify existing non-compliant resources, remediate them, then switch to Deny. Document the exemption process for break-glass scenarios."
      },
      {
        q: "When do you choose system-assigned versus user-assigned managed identity?",
        a: "System-assigned when the resource is a singleton and you want automatic lifecycle management — the identity is created and deleted with the resource, and RBAC assignments are automatically cleaned up. User-assigned when multiple resources share the same identity (both slots of a Function App deployment slot, or a fleet of identical microservices all needing the same Service Bus permissions), when you need to pre-provision RBAC assignments before the resource exists (common in Bicep where the identity is created first, permissions assigned, then the resource that uses it), or when the resource may be recreated (system-assigned MI changes on recreation, invalidating all RBAC assignments). For production integration services I almost always use user-assigned to avoid the re-assignment problem during incident recovery or blue/green deployments."
      },
      {
        q: "Walk me through the PIM workflow for a production access request.",
        a: "All production roles above Reader are eligible-only in PIM — no permanent assignments. An engineer needing production access opens a PIM activation request in the Azure portal or via az cli: they select the eligible role (e.g., Contributor on the production subscription), set a duration (maximum 4 hours, often 1 hour for read-only investigation), and provide a business justification referencing the incident ticket number. A manager or peer approver receives an email and Teams notification. They review the justification and approve. PIM immediately elevates the role for the requested duration. Azure Activity Log records every action taken under the elevated role, tied to the engineer's personal identity — not a shared account. At expiry, the elevation is automatically removed. PIM also captures an audit log of every activation, approval, and expiry. This satisfies SOC 2 CC6.3 and ISO 27001 A.9.2.3 requirements for privileged access management."
      },
      {
        q: "What are the Key Vault access patterns and which do you use in different scenarios?",
        a: "Three patterns. Key Vault References in App Settings: the platform resolves the secret at startup using the app's managed identity and injects it as an environment variable. Zero code changes, but requires an app restart to pick up rotated secrets. Best for connection strings and configuration that rarely rotates. DefaultAzureCredential in code: the app calls Key Vault directly at runtime, fetching secrets on demand. Supports rotation without restart and is the right choice for frequently-rotated secrets like signing keys or OAuth client secrets. Cache the secret in memory with a TTL (e.g., 5 minutes) to avoid Key Vault throttling. APIM Named Value with KV Reference: APIM fetches the secret using its managed identity and caches it — best for APIM policy secrets like backend API keys. All three patterns require the app or service's managed identity to have the Key Vault Secrets User role on the specific secret — never the legacy vault access policy model, never a service principal with a client secret stored somewhere else."
      }
    ]
  },

{
    id: "topic17",
    num: "17",
    title: "Monitoring & Observability",
    isKey: false,
    oneThing: "My observability setup: all diagnostic logs to Log Analytics, Application Insights for distributed traces with correlation IDs, and metric alerts on DLQ depth, failed runs, and APIM 429 rate.",
    story: "When a claim was getting stuck — no error, just not completing — I opened Application Insights and queried by the CorrelationId that was threaded through from APIM to Service Bus to Logic App to Function App. The distributed trace showed the Logic App action that called the SQL Server was taking 45 seconds — the private endpoint DNS resolution was broken after a network change, causing TCP timeout rather than a clean failure. Fixed the DNS zone link, deployed, confirmed in App Insights. Without correlation IDs and distributed tracing, that would have taken hours.",
    concepts: [
      {
        title: "Log Analytics Workspace",
        body: "Central repository for all diagnostic logs across Azure resources. Resources emit logs via Diagnostic Settings. You query with KQL against tables like AzureDiagnostics, AzureMetrics, and resource-specific tables."
      },
      {
        title: "Application Insights & Distributed Tracing",
        body: "Application Performance Management (APM) tool that captures requests, dependencies, exceptions, and custom events. Distributed traces are stitched together via a shared CorrelationId or Operation ID that flows across APIM, Service Bus, Logic Apps, and Function Apps."
      },
      {
        title: "Metric Alerts & Action Groups",
        body: "Azure Monitor metric alerts fire when a signal crosses a threshold. Critical integration signals: DLQ depth (DeadLetteredMessageCount), Logic App failed runs, APIM 429 rate, and Function App failure rate. Action Groups define who and how to notify."
      },
      {
        title: "KQL (Kusto Query Language)",
        body: "Query language for Log Analytics and Application Insights. Key tables: AzureDiagnostics (PaaS resource logs), requests (App Insights HTTP), dependencies (App Insights outbound calls), exceptions (App Insights errors), AzureMetrics (metric time series)."
      }
    ],
    terms: [
      ["Log Analytics Workspace", "Central store for diagnostic logs from Azure resources; queried with KQL."],
      ["Application Insights", "Distributed tracing and APM service; captures requests, dependencies, exceptions, and custom events."],
      ["KQL", "Kusto Query Language. Key tables: AzureDiagnostics, requests, dependencies, exceptions, AzureMetrics."],
      ["CorrelationId / Operation ID", "A unique ID threaded through all hops of a request (APIM → SB → Logic App → Function) to stitch distributed traces together."],
      ["Diagnostic Settings", "Per-resource configuration that routes logs and metrics to a Log Analytics Workspace, Event Hub, or Storage Account."],
      ["Tracked Properties", "Custom key-value metadata attached to Logic App runs (e.g., ClaimId, PolicyNumber) that make business-level searching possible in Log Analytics."],
      ["Action Group", "Azure Monitor construct defining notification recipients and channels (email, SMS, webhook, ITSM) triggered by an alert rule."],
      ["Live Metrics", "Real-time streaming view in Application Insights showing incoming requests, failures, and server health with sub-second latency — useful during incident triage."]
    ],
    code: {
      title: "KQL — Logic App Failed Runs (last 1 hour)",
      body: `AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where status_s == "Failed"
| where TimeGenerated > ago(1h)
| project WorkflowName = resource_workflowName_s,
          RunId = resource_runId_s,
          ErrorCode = error_code_s,
          StartTime = startTime_t
| order by StartTime desc`
    },
    deeper: [
      "<strong>Key metrics to alert on:</strong> DLQ depth (DeadLetteredMessageCount > 0), Logic App Failed Runs (count > threshold), APIM 429 rate (throttled calls spike), Function App failure rate, and private endpoint / DNS resolution latency.",
      "<strong>KQL for failed Logic App runs:</strong> Query AzureDiagnostics where ResourceType == 'WORKFLOWS' and status_s == 'Failed', projecting WorkflowName, RunId, ErrorCode, and StartTime — allows you to pivot from alert to root cause without portal navigation.",
      "<strong>Tracked properties in Logic Apps:</strong> Set via the 'Configure run settings' on an action or trigger; stored as custom dimensions in Log Analytics. Use them for business correlation (e.g., ClaimId) so you can find all runs related to a specific record, not just a technical run ID.",
      "<strong>Correlation ID threading:</strong> APIM injects a correlation header; Logic Apps and Function Apps read and forward it. Application Insights auto-correlates spans when the SDK sees the standard traceparent / x-ms-client-tracking-id headers — giving you a single distributed trace view.",
      "<strong>Alert fatigue prevention:</strong> Use dynamic thresholds (ML-based baseline) for metrics with natural variation (e.g., message throughput). Use static thresholds with suppression windows for DLQ depth to avoid repeat alerts during a known incident.",
      "<strong>Workbooks and dashboards:</strong> Azure Monitor Workbooks combine KQL queries, metrics charts, and markdown into a single operational view. Pin critical queries to a shared dashboard so the team does not need to know KQL during an incident."
    ],
    qa: [
      {
        q: "How do you implement end-to-end distributed tracing across APIM, Service Bus, Logic App, and Function App?",
        a: "APIM injects a correlation ID header (x-ms-client-tracking-id or a custom header) on every inbound request. The Logic App reads the header and stores it as a tracked property and forwards it in the Service Bus message properties. The Function App reads the property from the message, sets it as the Application Insights Operation ID via the TelemetryClient, and includes it in any outbound calls. Application Insights stitches all spans sharing that Operation ID into a single end-to-end transaction view. This lets you query by one ID and see every hop including timing, errors, and dependency calls."
      },
      {
        q: "What KQL query would you use to monitor Service Bus health?",
        a: "I query AzureDiagnostics for raw message counts and errors, grouped into 5-minute buckets, and separately query AzureMetrics for DLQ depth to drive alerting. The two queries together give throughput trends and an actionable dead-letter signal.",
        code: `AzureDiagnostics
| where ResourceType == "SERVICEBUS"
| where TimeGenerated > ago(1h)
| summarize
    TotalMessages = sum(IncomingMessages_d),
    DeadLettered  = sum(OutgoingMessages_d),
    ServerErrors  = sum(ServerErrors_d)
  by bin(TimeGenerated, 5m), ResourceName
| order by TimeGenerated desc

// Alert query: DLQ depth
AzureMetrics
| where MetricName == "DeadLetteredMessageCount"
| where Maximum > 0
| project TimeGenerated, ResourceName = Resource, DLQDepth = Maximum`
      },
      {
        q: "How do you set up metric alerts for a Service Bus DLQ so the on-call engineer is paged?",
        a: "Create an Azure Monitor alert rule on the Service Bus namespace targeting the DeadLetteredMessageCount metric. Set the aggregation to Maximum, condition to 'greater than 0', and evaluation frequency to 1 minute with a 5-minute window. Attach an Action Group that calls a webhook to PagerDuty or sends an email plus SMS. In Bicep you define this as a Microsoft.Insights/metricAlerts resource pointing at the namespace resource ID, keeping the alert definition in version control alongside the infrastructure it monitors."
      },
      {
        q: "How do you use tracked properties in Logic Apps to enable business-level correlation in Log Analytics?",
        a: "In the Logic App run settings (or on individual actions), you define tracked properties as key-value pairs where the value is an expression referencing the workflow body, for example ClaimId: @{triggerBody()?['claimId']}. These are emitted to Log Analytics as custom columns in AzureDiagnostics. You can then query: AzureDiagnostics | where ResourceType == 'WORKFLOWS' | where trackedProperties_ClaimId_s == '12345' to find every run associated with that business entity — essential for support teams who know the claim number but not the technical run ID."
      },
      {
        q: "Walk me through investigating a Logic App failure using KQL — starting from an alert firing.",
        a: "First I query AzureDiagnostics filtering ResourceType == 'WORKFLOWS' and status_s == 'Failed' to get the RunId and error code. I take the RunId and query again with resource_runId_s to see each action's status and timing, identifying which action failed. If the action calls an external dependency I pivot to Application Insights: query dependencies where id contains the RunId to see the outbound call duration and result code. If it is a timeout I check the DNS or network layer. If it is an HTTP 500 I query exceptions in Application Insights for the downstream service. The full chain from alert to root cause typically takes under 5 minutes with pre-built KQL queries saved in a Log Analytics workspace."
      }
    ]
  },

  {
    id: "topic18",
    num: "18",
    title: "DevOps & IaC",
    isKey: false,
    oneThing: "Everything in code, everything in git, nothing clicked in the portal. Bicep for infrastructure, GitHub Actions with OIDC for deployment — no stored Azure credentials anywhere.",
    story: "On the Insurance project I set up APIOps — the Azure APIM DevOps toolkit — so all APIM APIs, policies, and products were extracted to a Git repository. When a developer added a new API, they raised a PR. The pipeline ran a policy linter, validated the policy XML, got team lead approval, and applied to Dev automatically then Prod on manual gate. When an incident required a policy rollback, it was a git revert and a pipeline run — 5 minutes.",
    concepts: [
      {
        title: "Bicep & Infrastructure as Code",
        body: "Bicep is Azure's domain-specific language for IaC that compiles to ARM JSON. It provides type safety, modules, and what-if previews. All Azure resources — networking, Service Bus, APIM, Logic Apps, Function Apps — are defined in Bicep and deployed via pipelines, meaning the Git history is the full audit trail of infrastructure changes."
      },
      {
        title: "OIDC Federated Credentials",
        body: "GitHub Actions authenticates to Azure via OpenID Connect without any stored client secrets. Azure AD is configured with a federated credential that trusts tokens from the GitHub Actions OIDC provider for a specific repository and branch. The pipeline requests a short-lived token at runtime — nothing stored, nothing that can be leaked."
      },
      {
        title: "APIOps — GitOps for APIM",
        body: "The Azure APIM DevOps Resource Kit extracts all APIM artifacts (APIs, operations, policies, products, named values) into a file-per-resource structure in Git. Changes go through PR review including automated policy XML linting, then are applied by the pipeline. Rollback is a git revert."
      },
      {
        title: "Deployment Strategies — Slot Swap & What-If",
        body: "Bicep what-if shows a dry-run diff of infrastructure changes before apply. For application deployments, Azure Functions and Logic Apps Standard support deployment slots: deploy to a staging slot, run smoke tests, then swap — giving zero-downtime deployments with instant rollback by swapping back."
      }
    ],
    terms: [
      ["Bicep", "Azure IaC DSL that compiles to ARM JSON; provides modules, type safety, and what-if preview."],
      ["OIDC Federated Credential", "GitHub Actions authenticates to Azure with a short-lived OIDC token — no stored client secret or password."],
      ["APIOps", "GitOps pattern for APIM using the Azure APIM DevOps Resource Kit; all APIs and policies live in Git."],
      ["Bicep what-if", "Dry-run mode that shows which resources will be created, modified, or deleted before a deployment group create runs."],
      ["Deployment Slot", "A parallel environment on the same Function App or Logic App Standard plan; swap slots for zero-downtime release with instant rollback."],
      ["Zip Deploy", "Deployment method for Logic Apps Standard and Function Apps: zip the workflow artifacts and push via az logicapp deployment source config-zip or az functionapp deployment source config-zip."],
      ["Environment Protection Rule", "GitHub Actions mechanism requiring manual approval before a job targeting a protected environment (e.g., Production) can run."],
      ["Managed Identity", "Azure AD identity assigned to a resource (e.g., Function App) allowing it to authenticate to other Azure services without credentials in config."]
    ],
    code: {
      title: "GitHub Actions — OIDC Login + Bicep What-If + Logic App Zip Deploy",
      body: `- name: Azure Login (OIDC)
  uses: azure/login@v2
  with:
    client-id: \${{ vars.AZURE_CLIENT_ID }}
    tenant-id: \${{ vars.AZURE_TENANT_ID }}
    subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}

- name: What-if check
  run: |
    az deployment group what-if \\
      --resource-group \${{ vars.RG_NAME }} \\
      --template-file infra/main.bicep \\
      --parameters @infra/params.\${{ vars.ENV }}.json

- name: Deploy infrastructure
  run: |
    az deployment group create \\
      --resource-group \${{ vars.RG_NAME }} \\
      --template-file infra/main.bicep \\
      --parameters @infra/params.\${{ vars.ENV }}.json

- name: Deploy Logic App
  run: |
    zip -r logic-app.zip . -i 'workflows/*' 'connections.json' 'host.json'
    az logicapp deployment source config-zip \\
      --name \${{ vars.LOGIC_APP_NAME }} \\
      --resource-group \${{ vars.RG_NAME }} \\
      --src logic-app.zip`
    },
    deeper: [
      "<strong>Logic Apps Standard deployment:</strong> Logic Apps Standard runs on the Azure Functions runtime, so deployment is a zip deploy of the workflows folder, connections.json, and host.json. Use az logicapp deployment source config-zip. The workflow JSON files are the deployable artifact — commit them to Git and the pipeline zips and pushes them.",
      "<strong>Bicep what-if in pipelines:</strong> Run az deployment group what-if as a pipeline step before the actual deployment. In a PR pipeline it surfaces exactly which resources will change, giving reviewers infrastructure-level diff visibility equivalent to a code diff. Treat a what-if output showing unexpected deletions as a blocking signal.",
      "<strong>Slot swap for zero-downtime:</strong> Deploy to a staging slot (az functionapp deployment slot swap --slot staging --target-slot production). The swap is atomic at the load-balancer level. If post-swap smoke tests fail, swap back immediately. Slot settings (app settings marked sticky) stay with the slot, so connection strings pointing at production databases do not follow the swap.",
      "<strong>OIDC setup — three IDs, no secrets:</strong> In the GitHub Actions workflow you supply AZURE_CLIENT_ID (app registration client ID), AZURE_TENANT_ID, and AZURE_SUBSCRIPTION_ID as repository variables (not secrets). The app registration in Azure AD has a federated credential scoped to your repo and branch. GitHub exchanges an OIDC token for an Azure access token at runtime — the token is valid for minutes, not stored anywhere.",
      "<strong>APIOps PR workflow:</strong> Developer extracts APIM artifacts to a branch, raises a PR. The pipeline runs the APIM policy linter (checks XML well-formedness and forbidden elements), validates named value references, requires team lead approval, then applies to Dev on merge and gates on Prod with an Environment Protection Rule requiring a second approval.",
      "<strong>Secrets management in pipelines:</strong> Application secrets (connection strings, API keys) are stored in Azure Key Vault. The pipeline or the deployed application uses a Managed Identity to retrieve them at runtime — never stored in pipeline variables or app settings as plaintext."
    ],
    qa: [
      {
        q: "How do you deploy Logic Apps Standard via CI/CD without credentials in the pipeline?",
        a: "I use OIDC federated credentials so GitHub Actions never holds a client secret. The workflow logs in with azure/login@v2 supplying only the client ID, tenant ID, and subscription ID as plain repository variables. Azure AD validates the GitHub OIDC token and issues a short-lived access token. The pipeline then zips the Logic App artifacts (workflows/, connections.json, host.json) and runs az logicapp deployment source config-zip. The Managed Identity on the Logic App handles all runtime Azure service access, so no credentials exist in app settings or pipeline variables."
      },
      {
        q: "How do you set up OIDC federated credentials between GitHub Actions and Azure?",
        a: "Register an app in Azure AD (or use an existing service principal). On the app registration, go to Certificates & Secrets, then Federated Credentials, and add a credential with issuer https://token.actions.githubusercontent.com, subject repo:org/repo:ref:refs/heads/main (adjust for branch or environment), and audience api://AzureADTokenExchange. Grant the service principal the required RBAC roles (e.g., Contributor on the resource group). Store the client ID, tenant ID, and subscription ID as GitHub repository variables. No secret is created or stored anywhere."
      },
      {
        q: "Walk me through the APIOps workflow for promoting an APIM policy change to production.",
        a: "A developer runs the extractor tool locally to pull current APIM state into the Git repo as YAML and XML files (one file per API, operation, policy). They make the policy change in the XML, commit to a feature branch, and raise a PR. The pipeline runs the policy linter (checks XML schema and forbidden constructs), validates all named value references exist, and posts the diff as a PR comment. A team lead approves and merges. On merge, the pipeline runs the publisher tool against Dev automatically. A second pipeline job targeting the Production environment is gated by an Environment Protection Rule requiring a second manual approval. Rollback is a git revert followed by a pipeline run — typically under 5 minutes."
      },
      {
        q: "How does Bicep what-if help prevent infrastructure incidents in a deployment pipeline?",
        a: "Az deployment group what-if performs a dry run against the ARM API and returns a diff showing resources that will be created, modified, or deleted — without making any changes. In a PR pipeline I run what-if and post the output as a PR comment, so reviewers see infrastructure changes alongside code changes. The critical case is detecting unintended deletions: if a parameter rename or module refactor would delete a production Service Bus namespace, what-if shows it before apply. I treat any unexpected delete as a blocking error and require explicit acknowledgement before the deploy step runs."
      },
      {
        q: "Explain the slot swap deployment pattern for Function Apps and why it gives zero-downtime rollback.",
        a: "A Function App with a staging slot means you have two instances of the app under one plan. You deploy new code to the staging slot and run integration smoke tests against the staging URL. When confident, az functionapp deployment slot swap atomically redirects production traffic to the previously-staging instance. The swap happens at the Azure load balancer level — no TCP connections are dropped mid-request for HTTP-triggered functions. If post-swap monitoring shows regressions, you swap back immediately — the old code is still warm in what is now the staging slot. Slot settings marked as sticky (e.g., the APPSETTING_USE_PROD_DB flag) stay with the slot so production connection strings do not bleed into staging."
      }
    ]
  },

  {
    id: "topic19",
    num: "19",
    title: "BizTalk Migration",
    isKey: true,
    oneThing: "I've lived BizTalk for 7 years and spent 3 years migrating it to Azure. When they ask about hybrid integration or legacy, this is where I have an unfair advantage.",
    story: "I assessed 147 BizTalk artifacts across 23 applications — orchestrations, maps, custom pipeline components, EDI trading partners. I risk-stratified them: 12 simple (straight port to Logic Apps), 7 medium (pattern redesign needed), 4 complex (Durable Functions for compensation logic). Built the Azure platform first — Hub-and-Spoke networking, Service Bus Premium, APIM with WAF, IaC in Bicep, APIOps CI/CD. Then migrated in waves. Ran BizTalk and Azure in parallel for 6 weeks with automated semantic output comparison. Zero production incidents at cutover.",
    concepts: [
      {
        title: "Assessment & Risk Stratification",
        body: "Before writing a single line of Azure code, audit all BizTalk artifacts: orchestrations, receive locations, send ports, maps, schemas, pipeline components, and EDI partners. Risk-stratify by complexity: simple (direct port), medium (pattern redesign), complex (stateful compensation logic requiring Durable Functions). This drives the wave plan and resource estimates."
      },
      {
        title: "BizTalk to Azure Component Mapping",
        body: "Each BizTalk construct has an Azure equivalent: Orchestration → Logic App or Durable Functions, Receive Location → APIM or Event Grid or Service Bus trigger, Send Port → Logic App HTTP action or Service Bus send, Pipeline → Function App, Map (XSLT) → Logic App Transform XML action or Function App, Schema (XSD) → Integration Account, Custom Functoid → Function call, Correlation Set → Durable Functions entity or Service Bus session, BAM → Application Insights + Log Analytics."
      },
      {
        title: "Parallel Running & Cutover Validation",
        body: "Run BizTalk and Azure in parallel for a defined period. Feed identical inbound messages to both systems and compare outputs semantically (not byte-for-byte, because timestamps and GUIDs will differ). Automated comparison scripts flag discrepancies. Only when the discrepancy rate is below the agreed threshold for N consecutive business days do you flip the DNS or APIM backend and retire BizTalk."
      },
      {
        title: "EDI & B2B Migration",
        body: "BizTalk EDI (AS2, EDIFACT, X12) maps to Azure Integration Account. Trading partner agreements, schemas, and certificates are migrated to the Integration Account. Logic Apps consume the Integration Account for EDI encode/decode actions. Azure API Management can front AS2 endpoints. More complex EDI requirements may use third-party platforms (e.g., Cleo, Axway) that integrate with Azure via SFTP or HTTP."
      }
    ],
    terms: [
      ["BizTalk Orchestration", "Long-running stateful process in BizTalk; migrates to Logic App (simple) or Durable Functions (complex compensation logic)."],
      ["Receive Location / Send Port", "BizTalk inbound/outbound adapters; migrate to APIM / Event Grid triggers and Logic App HTTP or Service Bus actions."],
      ["BizTalk Pipeline", "Message processing chain (decode, disassemble, validate, promote); migrates to Function App."],
      ["On-Premises Data Gateway", "Agent installed on-premises that connects outbound to Azure Relay, allowing Logic Apps and Power Platform to reach on-prem systems without inbound firewall rules."],
      ["Integration Account", "Azure resource holding EDI schemas, maps, certificates, and trading partner agreements; consumed by Logic Apps for AS2/EDIFACT/X12 encode and decode."],
      ["Durable Functions", "Stateful Function App extension using the virtual actor pattern; replaces complex BizTalk orchestrations with correlation sets or long-running compensation logic."],
      ["Correlation Set", "BizTalk mechanism for routing a reply message to the correct orchestration instance; migrated to Durable Functions entity key or Service Bus session ID."],
      ["Semantic Output Comparison", "Parallel-run validation technique: compare normalised business payload fields between BizTalk and Azure outputs, ignoring timestamps and generated IDs, to verify functional equivalence before cutover."]
    ],
    comparison: {
      title: "BizTalk vs Azure Integration — Component Mapping",
      headers: ["BizTalk Component", "Azure Equivalent", "Notes"],
      rows: [
        ["Orchestration", "Logic App / Durable Functions", "Logic App for simple flows; Durable Functions for compensation and correlation"],
        ["Receive Location", "APIM, Event Grid, SB Trigger", "Protocol-dependent; HTTP via APIM, events via Event Grid, queued via Service Bus"],
        ["Send Port", "Logic App HTTP/SB action", "Static routing via Logic App action; dynamic routing via Logic App conditions"],
        ["Pipeline (decode/validate)", "Function App", "Custom pipeline components become discrete Function App methods"],
        ["Map (XSLT)", "Transform XML action / Function", "Simple XSLT: Logic App built-in; complex: Function App with custom XSLT library"],
        ["Schema (XSD)", "Integration Account schema", "Uploaded to Integration Account; referenced by Logic App Validate XML action"],
        ["Custom Functoid", "Function App call", "Inline C# functoid logic becomes an HTTP-triggered Function called from Logic App"],
        ["Correlation Set", "Durable Functions entity / SB Session", "Session-enabled Service Bus queues for simple cases; Durable entity for complex state"],
        ["Suspend Queue", "DLQ + Logic App resubmit", "Dead-letter queue with a resubmit Logic App triggered manually or on schedule"],
        ["BAM (Business Activity Monitoring)", "App Insights + Log Analytics", "Tracked properties in Logic Apps + KQL dashboards replace BAM views"],
        ["BizTalk Admin Console", "Azure Portal + Monitor + Workbooks", "No direct equivalent; operational visibility via Monitor dashboards and Workbooks"],
        ["EDI / B2B (AS2, EDIFACT, X12)", "Integration Account + Logic Apps", "Trading partner agreements and schemas migrated to Integration Account"]
      ]
    },
    deeper: [
      "<strong>Full BizTalk to Azure component mapping:</strong> Orchestration → Logic App or Durable Functions; Receive Location → APIM/Event Grid/SB trigger; Send Port → Logic App action; Pipeline → Function App; Map → Transform XML action or Function; Schema → Integration Account; BAM → Application Insights with tracked properties. The mapping is one-to-one for 80% of artifacts.",
      "<strong>Custom functoids:</strong> BizTalk custom functoids are C# classes compiled into BizTalk's pipeline. In Azure, extract the logic into an HTTP-triggered Function App and call it from a Logic App HTTP action within a Transform XML action or as a standalone step. This also makes the logic independently testable.",
      "<strong>AS2/EDIFACT/X12 via Integration Account:</strong> Create an Integration Account (Basic tier for Logic Apps Standard), upload EDI schemas and maps, define trading partner agreements. Logic Apps use the built-in AS2, EDIFACT, and X12 encode/decode actions that reference the Integration Account. AS2 MDN acknowledgements are handled automatically.",
      "<strong>Parallel running strategy:</strong> Use a message splitter at the inbound layer (APIM policy or Azure Function) to duplicate every message to both BizTalk and the new Azure path. Outputs are written to a comparison store (Storage or Cosmos DB). A nightly job compares normalised payloads field by field and generates a discrepancy report. The go/no-go decision is data-driven, not gut-feel.",
      "<strong>Hardest patterns to migrate — correlation sets:</strong> BizTalk correlation sets hold long-running orchestration instances open waiting for a correlated reply (e.g., an order confirmation referencing the original order ID). In Azure, the equivalent is Durable Functions with an external event pattern: the orchestrator awaits an external event keyed on the correlation ID, with a configurable timeout and compensation path if the event never arrives.",
      "<strong>Risk stratification framework:</strong> Simple = stateless message routing and transformation with no long-running state, no EDI, no custom pipelines. Medium = XSLT maps with custom functoids, or EDI trading partners. Complex = orchestrations with correlation sets, compensation transactions, or sub-orchestrations. Complex items get Durable Functions and require dedicated design sprints."
    ],
    qa: [
      {
        q: "How do you approach a BizTalk to Azure migration assessment?",
        a: "Start with a full artifact inventory: use the BizTalk Server documentation tool or manual audit to list every orchestration, receive location, send port, pipeline, map, schema, and EDI trading partner. For each artifact, record the protocol, message volume, SLA, downstream dependencies, and any custom code. Risk-stratify into three tiers — simple (direct port to Logic Apps), medium (pattern redesign, e.g., custom functoids become Function calls), and complex (stateful compensation requiring Durable Functions). The output is a wave migration plan with effort estimates per tier. Build the Azure platform — networking, Service Bus, APIM, IaC — before migrating any application artifact, so every migrated app lands on production-ready infrastructure."
      },
      {
        q: "How does the On-Premises Data Gateway work?",
        a: "The On-Premises Data Gateway is an agent installed on a Windows server in the on-premises network. It connects outbound to Azure Relay (Service Bus under the hood) over port 443 — no inbound firewall rules required. Logic Apps and Power Platform connectors send requests to the Azure Relay, which tunnels them through the established outbound connection to the gateway agent, which forwards them to the on-premises system (SQL Server, file share, SAP, etc.) and relays the response back. The gateway supports high availability through clustering: multiple agent instances register under the same gateway name and Azure load-balances across them."
      },
      {
        q: "How did you run BizTalk and Azure in parallel during cutover and validate correctness?",
        a: "I inserted a message duplicator at the inbound layer — an APIM policy that cloned every inbound message and forwarded one copy to BizTalk (via the existing HTTPS endpoint) and one to the new Azure Service Bus topic. Both systems processed independently and wrote their output payloads to a comparison Azure Storage table keyed by a canonical message ID that was threaded through both paths. A nightly Azure Function read both outputs, normalised them (stripping timestamps, generated GUIDs, and whitespace), and compared field by field, writing a discrepancy report to a Power BI dataset. We agreed a threshold of zero discrepancies on business-critical fields for five consecutive business days before flipping production traffic. We ran for six weeks. Zero incidents at cutover."
      },
      {
        q: "How do you migrate EDI trading partners from BizTalk to Azure?",
        a: "Export the BizTalk EDI configuration: trading partner profiles, agreements, AS2 certificates, and the EDIFACT/X12 schemas. Create an Azure Integration Account and import the schemas. Recreate the trading partner agreements in the Integration Account, uploading the AS2 certificates to the Integration Account certificate store. Logic Apps Standard with the Integration Account connection use the built-in AS2 Decode, EDIFACT Decode, and X12 Decode actions. For AS2, APIM fronts the AS2 endpoint and handles the HTTPS termination and IP allowlisting per partner. MDN acknowledgements are returned by the Logic App AS2 decode action automatically. Run the EDI flows in parallel with BizTalk using the same duplication strategy, comparing decoded business payload fields."
      },
      {
        q: "What is the hardest BizTalk pattern to migrate and how do you handle it?",
        a: "The hardest pattern is a long-running orchestration with correlation sets — where BizTalk holds an orchestration instance open, sometimes for hours or days, waiting for a correlated response message. The direct Azure equivalent is Durable Functions using the external event pattern: the orchestrator function calls await context.WaitForExternalEvent('OrderConfirmed', timeout) keyed on the correlation ID. The timer and compensation path (what happens if the event never arrives within the timeout) are explicit code rather than BizTalk's drag-drop compensation shapes, which is actually clearer to reason about. The complexity is in mapping BizTalk's correlation property promotion (promoted properties in the message context) to whatever ID you will use as the Durable Functions instance ID or the external event key — I typically use the business transaction ID (e.g., OrderId) rather than a generated GUID to make it human-readable in monitoring."
      }
    ]
  },

  {
    id: "topic20",
    num: "20",
    title: "AI Pipeline",
    isKey: true,
    oneThing: "I designed and delivered a 5-stage Azure AI enrichment pipeline for client financial data profiling — this was one of the first production LLM integrations in our practice.",
    story: "The client had financial profiles aggregated from 5 systems with inconsistent quality. I built a sequential pipeline: Stage 1 — Pattern Detection (regex coverage per field). Stage 2 — PII Detection (Azure AI Language, category + confidence per entity). Stage 3 — Anomaly Detection (Azure Anomaly Detector, statistical outlier flagging). Stage 4 — Rule Checking (47 business policy rules, violation array). Stage 5 — Quality Scoring (0-100 composite score stored as JSONB in PostgreSQL). Each stage was a Function App triggered by Service Bus. Failures isolated per stage — stage 3 failing didn't stop stage 4 on other records. Full audit trail. The ML team filtered to quality score > 70 and saw 18% model accuracy improvement.",
    concepts: [
      {
        title: "Stage-Isolated Pipeline Architecture",
        body: "Each stage is a separate Function App triggered by a dedicated Service Bus topic subscription. A stage reads the record from PostgreSQL, enriches it, writes the result back as a new JSONB column, and publishes a message to the next topic. Stage failures are isolated: a dead-lettered message in stage 3 does not block stage 4 processing on other records. Full audit trail is the accumulated JSONB columns per record."
      },
      {
        title: "Azure AI Services Integration",
        body: "Azure AI Language provides PII entity detection (name, address, financial account numbers) with category and confidence score per entity. Azure Anomaly Detector provides statistical outlier detection on time series or univariate data. Azure OpenAI (GPT-4) provides generative reasoning for unstructured field interpretation. Each is called via REST from the relevant Function App stage."
      },
      {
        title: "RAG — Retrieval-Augmented Generation",
        body: "RAG combines a vector search index (Azure AI Search with vector fields) with a generative model (Azure OpenAI). At query time, the user question is embedded using Ada-002, the top-K semantically similar documents are retrieved from the index, and they are injected into the GPT-4 prompt as context. This grounds the model in factual, current data and reduces hallucination — the model cites retrieved chunks rather than generating from parametric memory."
      },
      {
        title: "Spec-Driven Development with AI Assistance",
        body: "Write a precise, unambiguous functional specification before implementation — including input/output contracts, edge cases, error conditions, and acceptance criteria. Claude or GitHub Copilot generates implementation stubs, unit tests, and IaC from the spec. Bugs found in code review are traced back to spec ambiguity and fixed in the spec first. This produces a testable, reviewable spec as a first-class artifact, not just code."
      }
    ],
    terms: [
      ["RAG", "Retrieval-Augmented Generation: embed a query, retrieve top-K semantically similar documents from a vector index, inject as context into an LLM prompt."],
      ["Spec-Driven Development", "Write a precise functional spec (input/output contracts, edge cases, acceptance criteria) first; use AI to generate implementation stubs and tests from it."],
      ["Azure AI Language", "Managed NLP service providing PII entity recognition, sentiment analysis, key phrase extraction, and named entity recognition."],
      ["Azure OpenAI", "Azure-hosted OpenAI models (GPT-4, Ada-002) with private networking, RBAC, content filtering, and enterprise SLA."],
      ["Azure AI Search", "Managed search service supporting vector search (for RAG), hybrid search (keyword + semantic), and integrated indexers for Azure Blob, Cosmos DB, and SQL."],
      ["Azure Anomaly Detector", "Managed API for univariate and multivariate anomaly detection on time series data; returns anomaly flag, severity, and expected value range per data point."],
      ["JSONB", "PostgreSQL binary JSON column type supporting indexing and querying of nested JSON structures; used here to store the accumulated enrichment output of each pipeline stage per record."],
      ["Prompt Engineering", "Designing LLM prompts with role, context, constraints, and output format instructions to produce reliable, parseable outputs; system prompt defines behaviour, user prompt supplies the specific request."]
    ],
    diagram: `[Service Bus]─→[Stage 1: Pattern Detection (Function)]
                        │
                   [PostgreSQL JSONB]
                        │
              [Stage 2: PII Detection (Function)]
                        │ Azure AI Language
                   [PostgreSQL JSONB]
                        │
            [Stage 3: Anomaly Detection (Function)]
                        │ Azure Anomaly Detector
                   [PostgreSQL JSONB]
                        │
              [Stage 4: Rule Checking (Function)]
                        │ 47 business rules
                   [PostgreSQL JSONB]
                        │
             [Stage 5: Quality Scoring (Function)]
                        │ 0-100 composite score
                   [PostgreSQL JSONB]
                        │
                [ML Team: score > 70 filter]
                  18% accuracy improvement`,
    deeper: [
      "<strong>Azure OpenAI integration in Logic Apps:</strong> Use the built-in Azure OpenAI connector (available in Logic Apps Standard) or call the REST API via an HTTP action. Pass the conversation context (system prompt + user message) as JSON. For production, host Azure OpenAI with a private endpoint so traffic never leaves the VNet. Apply content filtering policies and store prompts/completions in Log Analytics for audit.",
      "<strong>Spec-driven approach:</strong> Before writing any Function App code, write a markdown spec defining: the input message schema, the enrichment output schema, the external API being called, the retry policy, the error output schema, and the acceptance test cases. Claude generates the Function App stub, unit tests, and Bicep IaC from the spec. The spec becomes the PR description — reviewers validate business logic against the spec, not against inferred intent from the code.",
      "<strong>Fault tolerance per stage:</strong> Each stage Function App is configured with a Service Bus trigger that has maxDeliveryCount set (e.g., 5). On repeated failure the message is dead-lettered. A separate monitoring Function checks DLQ depth and raises an alert. Crucially, DLQ in stage 3 does not affect stage 4 — other records continue processing. A resubmit Function can replay DLQ messages after the root cause is fixed, without reprocessing the entire batch.",
      "<strong>RAG implementation with Azure AI Search:</strong> Index documents into Azure AI Search with a vector field populated by Ada-002 embeddings (1536 dimensions). At query time: embed the user query with Ada-002, issue a vector search against the index (top-K = 5), concatenate the retrieved chunk texts into the GPT-4 system prompt as context, and send the user question as the user message. The model is instructed to answer only from the provided context and to cite chunk IDs. This pattern works for policy Q&A, contract review, and data dictionary lookups.",
      "<strong>Quality score composite design:</strong> The stage 5 score is a weighted sum across dimensions: completeness (30%), PII risk penalty (20%), anomaly flag penalty (25%), rule violation penalty (15%), and pattern coverage (10%). Each dimension produces a 0-100 sub-score; the weighted sum is the composite. Weights are configuration stored in PostgreSQL, not hardcoded, so the ML team can tune them without a deployment.",
      "<strong>LLM cost and latency management:</strong> Cache repeated identical prompts in Azure Cache for Redis with a TTL matching the data freshness requirement. Use GPT-3.5-Turbo for high-volume low-complexity classification tasks and GPT-4 only for reasoning-heavy tasks. Set max_tokens conservatively and use streaming where the consumer can process partial responses. Track per-call token counts in Application Insights custom events to spot prompt bloat early."
    ],
    qa: [
      {
        q: "Tell me about your AI pipeline in detail.",
        a: "I built a 5-stage sequential enrichment pipeline for client financial profile data aggregated from 5 source systems. Each stage is an Azure Function App triggered by a Service Bus topic subscription. Stage 1 runs regex pattern detection across all fields and records a coverage percentage per field. Stage 2 calls Azure AI Language for PII entity detection, storing detected entity category, text, and confidence score. Stage 3 calls Azure Anomaly Detector on numeric fields, flagging statistical outliers with severity scores. Stage 4 evaluates the record against 47 business policy rules, producing a violation array. Stage 5 computes a 0-100 composite quality score as a weighted sum across all prior stage outputs. Each stage writes its output as a new JSONB column on the PostgreSQL record before publishing to the next Service Bus topic. Failures in any stage dead-letter just that record — other records continue. The ML team applied a quality score filter of greater than 70 and saw an 18% improvement in model accuracy."
      },
      {
        q: "How would you integrate Azure OpenAI into an existing Logic Apps workflow?",
        a: "For Logic Apps Standard, use the built-in Azure OpenAI connector which handles authentication via Managed Identity — no API key in config. Define the system prompt as a workflow parameter (so it can be changed without code deployment) and construct the user message from the workflow context using expressions. Parse the response JSON to extract the choices[0].message.content field using the Parse JSON action. For production, deploy Azure OpenAI with a private endpoint and add the Logic App's outbound IP or VNet integration to the Azure OpenAI network allowlist. Enable content filtering policies in the Azure OpenAI resource. Log every request and response (prompt, completion, token counts) to Application Insights as custom events for audit and cost tracking. For high-throughput scenarios, call the OpenAI API from a Function App instead, where you have finer control over retry logic, parallelism, and streaming."
      },
      {
        q: "How would you implement RAG using Azure AI Search and Azure OpenAI?",
        a: "First, chunk your documents (policy PDFs, data dictionaries, contracts) into 500-1000 token chunks with a 100-token overlap. Index each chunk into Azure AI Search with a vector field: call the Ada-002 embedding API to get a 1536-dimension vector per chunk and store it alongside the text and metadata (source document, page number, section). Enable the built-in Azure AI Search vectorizer to call Ada-002 automatically during indexing if you prefer. At query time: embed the user question with Ada-002, issue a hybrid search (keyword + vector) against the index with top-K equals 5, collect the returned chunk texts. Construct the GPT-4 prompt with a system instruction telling the model to answer only from the provided context and to cite chunk IDs, and the user question. Parse the response. The citation requirement is key — it allows you to surface source links in the UI and lets you audit whether the model is staying grounded. For freshness, set up an Azure AI Search indexer on a schedule to re-index updated documents."
      },
      {
        q: "How do you ensure fault tolerance across the 5 pipeline stages so one failure does not cascade?",
        a: "Each stage's Service Bus trigger is configured with a maxDeliveryCount (for example, 5). If a stage function throws an exception or times out, Service Bus retries up to that count with exponential backoff managed by the Service Bus trigger binding. After maxDeliveryCount exhausted, the message moves to the stage's dead-letter queue. Crucially, the dead-lettered message is one record — all other records on the topic continue processing normally on other Function App instances. A separate monitoring Function App polls each stage's DLQ depth every minute and raises an Azure Monitor alert if depth exceeds zero. A resubmit utility Logic App can move messages from the DLQ back to the active queue after the root cause is fixed, without reprocessing the full batch. The PostgreSQL JSONB audit columns show exactly how far each record progressed, so partial reprocessing from any stage is possible by filtering on which JSONB columns are null."
      },
      {
        q: "Explain spec-driven development and how you use Claude and GitHub Copilot in your implementation workflow.",
        a: "Spec-driven development means the specification is a first-class artifact written before any implementation code. For each pipeline stage I write a markdown spec covering: the input message schema with field types and constraints, the external API being called with request and response schemas, the transformation logic including edge cases, the error output schema for dead-letter messages, the retry policy, and a table of acceptance test cases with inputs and expected outputs. I then paste the spec into Claude and ask it to generate the Function App implementation stub, the unit test file with all acceptance cases, and the Bicep resource definition. I review the generated code against the spec — any disagreement is a signal that the spec was ambiguous, so I fix the spec first and regenerate. GitHub Copilot then assists with inline completion during the review edits. The spec becomes the PR description, so reviewers can validate business logic against the spec rather than trying to infer intent from the code. This approach cut our average stage implementation time from 2 days to half a day."
      }
    ]
  }

];

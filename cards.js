// ===== CHEAT SHEET CARDS — One thing to say, one story to tell =====
// Design rule: each card = 1 confident statement + 1 story + 3 terms + 3 if-deeper bullets + 2 Q&As

const CARDS = [

  {
    id: "topic5", num: "05", title: "Azure Storage",
    isKey: false,
    oneThing: "Storage is the silent backbone of every Azure integration — Logic Apps Standard state, Function App coordination, Event Hub Capture, Integration Account maps — it's all Storage under the hood.",
    story: "On the Insurance project, every Logic App Standard workflow wrote its run state to a Storage Account — that's how stateful workflows survive restarts. I connected all integration components to Storage using Managed Identity with Storage Blob Data Contributor scope, not connection strings. When we had an incident where run history was ballooning costs, I added lifecycle policies to archive processed-payload blobs after 30 days.",
    terms: [
      ["Blob / Hot / Cool / Archive", "Three cost tiers — hot is fast & expensive, archive is cheap & slow (hours to read)"],
      ["SAS Token", "Signed URL for time-limited external access — use MI instead for internal Azure services"],
      ["Lifecycle Policy", "Auto-move or delete blobs by age — critical for cost control on run histories"],
    ],
    deeper: [
      "<strong>Storage Account</strong> = top-level namespace. Blobs (files), Queues (simple tasks), Tables (NoSQL audit logs), Files (SMB shares for legacy adapters).",
      "<strong>Managed Identity connection:</strong> set AzureWebJobsStorage__accountName + credential=managedidentity in Function App settings. No connection string needed.",
      "<strong>Event Hub Capture</strong> writes streaming events to Blob (Avro format) automatically on time/size windows — no code required."
    ],
    qa: [
      { q: "How do you secure a Function App's connection to Storage without a connection string?", a: "Enable system-assigned Managed Identity on the Function App. Grant it 'Storage Blob Data Contributor' on the storage account. In App Settings set AzureWebJobsStorage__accountName and AzureWebJobsStorage__credential=managedidentity. The runtime acquires the token automatically — no key, no rotation risk." },
      { q: "Why does Logic Apps Standard need a Storage Account?", a: "Logic Apps Standard uses Storage to persist workflow state (for stateful workflows), run history inputs/outputs, and artifact files like connection references. Without it, workflows can't survive restarts and you lose the run history audit trail. That's why storage is provisioned before deploying any Logic App Standard in our Bicep templates." }
    ]
  },

  {
    id: "topic6", num: "06", title: "Messaging Concepts",
    isKey: false,
    oneThing: "The number one mistake I see is assuming message delivery is exactly-once. It isn't — it's at-least-once. Every consumer must be idempotent.",
    story: "Early in the Insurance migration we had a claims processor inserting duplicate records in the database. The root cause was a lock timeout — the message was still being processed when the lock expired, so Service Bus redelivered it. We fixed it two ways: extended the lock duration beyond max processing time, and added a deduplication table in SQL keyed on MessageId. Now every message has a unique ClaimId as its MessageId and we UPSERT rather than INSERT.",
    terms: [
      ["Idempotency", "Same operation N times = same result as once. Required because brokers deliver at-least-once."],
      ["DLQ", "Dead-Letter Queue — holds messages that failed MaxDeliveryCount retries. Always monitor this."],
      ["Peek-Lock", "Receive and hold. Consumer must explicitly Complete or Abandon. Safer than ReceiveAndDelete."],
    ],
    deeper: [
      "<strong>Queue vs Pub-Sub:</strong> queue = one consumer gets each message (competing consumers). Pub-sub (topic) = every subscriber gets their own copy.",
      "<strong>MaxDeliveryCount:</strong> how many retries before dead-lettering (default 10). Poison messages end up in DLQ — always alert on DLQ depth > 0 for critical queues.",
      "<strong>Lock Duration</strong> must exceed your worst-case processing time. If processing takes 90s and lock is 60s, the message reappears and gets double-processed."
    ],
    qa: [
      { q: "How do you implement idempotency in a Service Bus consumer?", a: "Three layers: (1) Enable duplicate detection on the queue with a 10-minute window — rejects messages with duplicate MessageId. (2) Application-level: store processed MessageIds in a dedup table with a unique constraint — UPSERT on business key rather than INSERT. (3) Design operations to be naturally idempotent: setting a status to 'Approved' twice has the same result as once. Use ClaimId or OrderId as the MessageId so it carries business meaning." },
      { q: "What causes a message to go to the DLQ?", a: "Five causes: (1) MaxDeliveryCount exceeded — consumer failed or called Abandon() too many times. (2) Message TTL expired before processing. (3) Lock expired and MaxDeliveryCount reached. (4) Consumer explicitly dead-letters the message (for data errors — wrong format, business rule violation). (5) Session lock lost. The DeadLetterReason property on the DLQ message tells you which. My production rule: alert on DLQ depth > 0 for payment queues immediately, > 10 for lower-priority queues." }
    ]
  },

  {
    id: "topic7", num: "07", title: "Azure Service Bus",
    isKey: true,
    keyNote: "★ JD priority — APIM + Service Bus is their core pattern. Know this cold.",
    oneThing: "Service Bus is where I spend most of my time — queues for point-to-point, topics for fan-out, sessions for ordered processing, and DLQ as an operational health signal.",
    story: "On the Insurance project I had APIM publish directly to a Service Bus queue using a Managed Identity send-request policy — no relay Function App needed. The APIM MI had Azure Service Bus Data Sender role on the namespace. The policy built the BrokerProperties header with MessageId set to context.RequestId and returned 202 immediately. This eliminated a whole Function App from the hot path and cut end-to-end latency by about 50ms. The queue fed a Logic App that handled the actual business processing.",
    terms: [
      ["Namespace / Queue / Topic / Subscription", "Namespace = container. Queue = point-to-point. Topic + Subscriptions = pub-sub fan-out."],
      ["Session", "Groups related messages for ordered delivery to one consumer at a time. Set SessionId on messages."],
      ["Duplicate Detection", "Reject messages with duplicate MessageId within a configurable time window (up to 7 days)."],
    ],
    deeper: [
      "<strong>Tiers:</strong> Basic = queues only. Standard = topics, 256KB max. Premium = dedicated infra, 100MB messages, private endpoints, zone redundancy — use Premium for production.",
      "<strong>Filters on subscriptions:</strong> SQL filter (complex expressions) or Correlation filter (match on properties — faster, indexed). Use correlation filters at high throughput.",
      "<strong>Geo-DR:</strong> namespace alias paired to secondary region. Failover = flip the alias. Replicates metadata only, not in-flight messages."
    ],
    apimPolicy: `<!-- APIM: Publish to Service Bus via Managed Identity -->
<inbound>
  <set-variable name="body" value="@(context.Request.Body.As<string>(preserveContent:true))"/>
  <send-request mode="new" response-variable-name="sbResp" timeout="15">
    <set-url>https://{namespace}.servicebus.windows.net/{queue}/messages</set-url>
    <set-method>POST</set-method>
    <set-header name="Content-Type" exists-action="override"><value>application/json</value></set-header>
    <set-header name="BrokerProperties" exists-action="override">
      <value>@("{\"MessageId\":\"" + context.RequestId + "\"}")</value>
    </set-header>
    <authentication-managed-identity resource="https://servicebus.azure.net"/>
    <set-body>@((string)context.Variables["body"])</set-body>
  </send-request>
  <return-response>
    <set-status code="202" reason="Accepted"/>
    <set-header name="x-correlation-id" exists-action="override">
      <value>@(context.RequestId)</value>
    </set-header>
  </return-response>
</inbound>`,
    qa: [
      { q: "Walk me through APIM publishing to Service Bus using Managed Identity.", a: "Enable system-assigned MI on the APIM instance. Grant it 'Azure Service Bus Data Sender' role on the Service Bus namespace. In the API operation's inbound policy: use send-request to POST to https://{ns}.servicebus.windows.net/{queue}/messages. Add authentication-managed-identity element with resource=https://servicebus.azure.net — APIM fetches the token automatically. Set BrokerProperties header with MessageId = context.RequestId for deduplication. Return 202 immediately with a correlation ID. Client polls a status endpoint if needed. This pattern removes the relay Function App from the hot path entirely." },
      { q: "When would you use Service Bus Sessions?", a: "When you need guaranteed ordered processing for groups of related messages. Example: a claim has an original message and then 3 amendments — all must be processed in order, by one consumer. Set SessionId=ClaimId on all 4 messages. The session-enabled queue delivers all messages for that SessionId to one consumer at a time, in order. Other consumers handle other claims in parallel. I used this on the Insurance project for claim amendment sequences where processing out of order would corrupt the claim state." }
    ]
  },

  {
    id: "topic8", num: "08", title: "Azure Event Grid",
    isKey: false,
    oneThing: "Event Grid is for reactive notification — something happened, tell everyone who cares. It's push-based, near-real-time, and fans out to multiple handlers.",
    story: "I used Event Grid on the Insurance project to react to file uploads. Claims documents were dropped to Blob Storage by the client portal. A Storage system topic fired a BlobCreated event instantly — no polling. Event Grid delivered it to a Logic App (one subscription) and a Function App (another subscription) in parallel. The Logic App triggered a notification workflow; the Function App started the document parsing pipeline. Both ran independently. If I'd used a Blob trigger on the Function App instead, I'd have had polling latency and potential missed events at scale.",
    terms: [
      ["System Topic", "Auto-created Event Grid topic for Azure services (Blob, Resource Manager, Service Bus, etc.)"],
      ["Event Subscription", "Route events from a topic to a specific handler with optional event type / subject filters"],
      ["CloudEvents", "CNCF open schema for events — preferred over the proprietary Event Grid schema for portability"],
    ],
    deeper: [
      "<strong>Event Grid vs Service Bus vs Event Hub:</strong> Event Grid = reactive notification (push, no retention). Service Bus = reliable command messaging (DLQ, sessions, TTL). Event Hub = high-volume streaming with replay.",
      "<strong>Dead-lettering:</strong> configure a Storage blob container on the subscription. Events that fail all retries (up to 18 over 24h) are written there — always configure this in production.",
      "<strong>Webhook validation:</strong> Event Grid sends a validation handshake before delivering events. Your endpoint must return the validationCode within 30 seconds."
    ],
    qa: [
      { q: "When do you choose Event Grid over Service Bus?", a: "Event Grid for notification — something happened, react to it, multiple handlers can respond. Service Bus for reliable command messaging — do this thing, guarantee delivery, support retries and DLQ. Practical rule: if I'm saying 'a blob was created' or 'a resource was deployed', that's Event Grid. If I'm saying 'process this claim' or 'charge this payment', that's Service Bus. They often work together — Event Grid triggers a Logic App notification and also puts a message on a Service Bus queue for the reliable processing path." },
      { q: "How does Event Grid ensure reliability?", a: "It retries delivery with exponential backoff for up to 24 hours (18 retries maximum). It validates webhook endpoints before delivering events. Configure a dead-letter blob container on every production subscription — events that exhaust all retries are written there so nothing is silently dropped. Set an Azure Monitor alert on the DeadLetteredCount metric on your subscriptions — any dead-lettered event should be investigated immediately." }
    ]
  },

  {
    id: "topic9", num: "09", title: "Azure Event Hub",
    isKey: false,
    oneThing: "Event Hub is a distributed log for high-volume streaming — millions of events per second, multiple independent readers, and crucially: replay. Unlike Service Bus, consuming a message doesn't delete it.",
    story: "I haven't used Event Hub as heavily as Service Bus in the Insurance project — that was predominantly message-driven. But I've designed an Event Hub architecture for telemetry ingestion where partitions mapped to consumer parallelism: 16 partitions meant max 16 parallel Function App instances per consumer group. The key design decision was the partition key — using the policy ID meant all events for one policy always landed in the same partition, preserving order for that entity without needing sessions.",
    terms: [
      ["Partition", "Ordered event sequence — unit of parallelism. Max consumers = partition count per consumer group."],
      ["Consumer Group", "Named independent view of the stream. Each group has its own offset — they don't interfere."],
      ["Capture", "Auto-archive events to Blob / ADLS Gen2 in Avro format. Set time or size window trigger."],
    ],
    deeper: [
      "<strong>Event Hub vs Service Bus:</strong> Event Hub for streaming telemetry at massive scale with replay. Service Bus for reliable business messaging with DLQ and transactions. They often work together.",
      "<strong>Partition count is immutable</strong> on Standard tier after creation. Set it higher than you think you need — I typically use 2× expected peak parallelism.",
      "<strong>Kafka compatibility:</strong> Event Hub exposes a Kafka-compatible endpoint — existing Kafka producers/consumers work with no code changes, just a config swap."
    ],
    qa: [
      { q: "How do partitions affect parallelism in Event Hub?", a: "Each partition can be read by exactly one consumer instance per consumer group at a time. So max parallelism = partition count. If you have 8 partitions and 16 Function App instances, only 8 will be active — the rest are idle. If you have 4 instances and 8 partitions, each instance handles 2 partitions. Choose partition count at creation based on your peak parallelism needs — you can't change it on Standard tier. For Azure Functions, the runtime scales to one instance per partition automatically up to the partition limit." },
      { q: "When would you use Event Hub Capture?", a: "When I need to archive streaming data beyond the 7-day retention window, or feed analytics tools. Capture writes to Blob or ADLS Gen2 in Avro format automatically — I configure it with a 5-minute time window. The path pattern includes namespace/eventhub/partition/year/month/day/hour so it's easy to query by time range. I'd combine it with lifecycle management policies to tier Capture files to Cool after 30 days. Downstream, Databricks Autoloader or Synapse can process these Avro files directly." }
    ]
  },

  {
    id: "topic10", num: "10", title: "Logic Apps",
    isKey: false,
    oneThing: "Logic Apps Standard is my primary tool — I've replaced 23 BizTalk orchestrations with Logic App workflows. The key decision is always Consumption vs Standard: for enterprise work with VNet, multi-workflow, and local dev, it's Standard every time.",
    story: "On the Insurance project, we migrated BizTalk orchestrations to Logic Apps Standard. The mental model shift was: BizTalk orchestrations are code with shapes; Logic Apps are designer-first JSON workflows. The translation: receive location → Service Bus trigger, orchestration logic → workflow actions, XSLT maps → built-in XSLT transform action using Integration Account maps, exception handling → Scope + Run After configured to catch Failed + TimedOut. I ran both BizTalk and Logic Apps in parallel for 6 weeks doing semantic output comparison before each cutover.",
    terms: [
      ["Stateful / Stateless", "Stateful persists every step to Storage — has run history, survives restart. Stateless is in-memory — faster, cheaper, no history."],
      ["Built-in vs Managed connector", "Built-in runs inside the Logic App runtime (faster, VNet-aware, no extra cost). Managed runs outside (SaaS connectors like Salesforce)."],
      ["Run After", "Control flow based on prior step outcome: Succeeded / Failed / TimedOut / Skipped. The foundation of error handling."],
    ],
    deeper: [
      "<strong>Consumption vs Standard:</strong> Standard = multi-workflow, VNet integration, local VS Code dev, stateful + stateless, hourly billing. Consumption = one workflow, multi-tenant, per-execution billing, no VNet.",
      "<strong>Error handling pattern:</strong> wrap main logic in a Scope. Add a second Scope with runAfter: {Main: [Failed, TimedOut]}. Inside catch scope: log to App Insights, send to Service Bus error queue, terminate as Failed.",
      "<strong>Expressions:</strong> @{triggerBody()?['ClaimId']}, @{body('ParseJSON')?['field']}, @{utcNow()}, @{guid()}. Always use ?[] null-safe operator to avoid 'expression evaluation failed' errors."
    ],
    qa: [
      { q: "How do you handle errors in a Logic App workflow?", a: "Scope + Run After. Wrap the main logic in a Scope action. Add a second Scope configured to run after the first only when it Failed or TimedOut. Inside the catch Scope: use result('Main_Scope')[0]['error']['message'] to extract the error message, post it to Application Insights via HTTP action, send a message to a Service Bus error queue with the correlation ID and error details, then Terminate with status Failed. I also configure retry policies per HTTP action — Exponential backoff with 3 retries for transient failures." },
      { q: "What replaced what when you migrated BizTalk to Logic Apps?", a: "Receive Location → Service Bus / HTTP / Blob trigger. Send Port → HTTP action or Service Bus send action. Orchestration → Stateful Logic App workflow. XSLT Map → Transform XML action with XSLT map in Integration Account (Standard also supports maps directly in project). Custom Functoid → Azure Function call. Correlation Set → Service Bus Session (SessionId = business key). Suspend Queue → Service Bus Dead-Letter Queue. BAM Tracking → Application Insights tracked properties. BizTalk Admin Console → Logic App Run History + Azure Monitor." }
    ]
  },

  {
    id: "topic11", num: "11", title: "Logic Apps — Advanced Patterns",
    isKey: false,
    oneThing: "The patterns that come up most: canonical model for multi-source integration, scope-based error handling with compensation, and tracked properties for end-to-end traceability in App Insights.",
    story: "On the Insurance project we had 5 source systems with different schemas — policy, claims, billing, reinsurance, portal. Rather than 25 point-to-point maps, I introduced a canonical ClaimEvent model. Each source had one inbound XSLT map (source → canonical). Each target had one outbound map (canonical → target). 10 maps total. When we added a 6th source system, we wrote one new map rather than 5. That's a direct EIP Content-Based Router + Canonical pattern, borrowed from the BizTalk days but cleaner in Logic Apps Standard.",
    terms: [
      ["Canonical Model", "Common intermediary format between all sources and targets. N+M maps instead of N×M."],
      ["Tracked Properties", "Custom dimensions emitted to App Insights per action — ClaimId, PolicyNumber — for end-to-end trace."],
      ["Integration Account", "Holds XSLT maps, XSD schemas, AS2/EDIFACT/X12 agreements, trading partners."],
    ],
    deeper: [
      "<strong>Chunking:</strong> Logic Apps has a 100MB message limit. For large files, use chunking in HTTP actions — the runtime splits the payload automatically if you enable it in action settings.",
      "<strong>Concurrency control:</strong> trigger concurrency setting limits parallel runs. I set this to match downstream system capacity — e.g. 50 concurrent runs if SQL can handle 50 concurrent writes.",
      "<strong>Re-run:</strong> stateful workflows support re-running a failed run from the portal. This replays the original trigger payload — it doesn't pull a new message from the queue."
    ],
    qa: [
      { q: "How did you implement end-to-end tracing across Logic App runs?", a: "Two mechanisms. First, tracked properties: on key actions (Parse JSON, Service Bus receive, HTTP call to backend) I configured tracked properties to emit ClaimId, PolicyNumber, and MessageId as custom dimensions to Application Insights. Second, correlation ID: the Service Bus message carried a CorrelationId property which I threaded through every action using a variable, included in every downstream HTTP call as x-correlation-id header, and logged in every App Insights trace. In Log Analytics I could then query: all Logic App actions for ClaimId=123 across all workflow runs, sorted by timestamp — giving a complete audit trail." },
      { q: "What's the difference between stateful and stateless Logic App workflows?", a: "Stateful: persists every action's inputs and outputs to Azure Storage. Has run history in the portal. Supports re-run. Survives restarts. Can run for up to 1 year. Use for: any business process needing audit trail, long-running workflows, human approval steps. Stateless: in-memory only. No run history. Faster and cheaper. Max a few minutes. Use for: high-throughput routing and transformation where you don't need audit — e.g. message fan-out, format conversion. On the Insurance project all business process workflows were stateful. Internal routing workflows (parse message, determine target queue) were stateless." }
    ]
  },

  {
    id: "topic12", num: "12", title: "Azure Functions",
    isKey: false,
    oneThing: "Functions are my transformation layer — stateless, event-triggered, no server management. I use them where Logic Apps is too heavy: data parsing, custom functoid replacements, AI API calls.",
    story: "I used Azure Function Apps on the Insurance project as the transformation layer that replaced BizTalk pipeline components. A Service Bus trigger on the Function received a raw claims payload, validated it against an XSD schema, transformed it to the canonical format using a .NET XSLT transform, and output-bound to a second Service Bus queue. The whole thing was on Premium plan for VNet integration — the Function needed to reach both the Service Bus private endpoint and a SQL Server private endpoint for a policy lookup. No public endpoints anywhere.",
    terms: [
      ["Trigger / Binding", "Trigger starts the function. Input/output bindings connect to data sources declaratively — no boilerplate connection code."],
      ["Premium Plan", "Always-warm instances (no cold start), VNet integration, unlimited execution duration. Use for production integration."],
      ["Durable Functions", "Stateful orchestration in code — fan-out/fan-in, waiting for external events, saga compensation."],
    ],
    deeper: [
      "<strong>Cold start:</strong> Consumption plan deallocates idle instances — first request after idle incurs 200-500ms+ startup. Use Premium plan (always-warm) for production Service Bus-triggered Functions.",
      "<strong>Scaling:</strong> Service Bus trigger scales one instance per 16 messages up to 200 (Consumption) or configured max (Premium). Increase maxConcurrentCalls in host.json to process more messages per instance.",
      "<strong>Durable fan-out pattern:</strong> orchestrator calls N activity functions in parallel with Task.WhenAll. State persisted automatically. Use for parallel validation steps — I used this for 3-way claim validation (fraud, policy, medical) running simultaneously."
    ],
    qa: [
      { q: "How does Azure Functions scale with a Service Bus trigger?", a: "The scale controller monitors queue message count and adds instances as load grows. Default: scales up to one instance per 16 messages up to 200 instances (Consumption) or configured max (Premium). Each instance processes up to maxConcurrentCalls messages in parallel (default 16 in host.json). So 10 instances × 16 concurrent = 160 parallel message processors. For production: set a minimum instance count of 2 on Premium to avoid cold starts, and monitor Active Messages metric — growing queue depth means either processing is slow or maxConcurrentCalls needs tuning." },
      { q: "When would you use Durable Functions vs a Logic App?", a: "Durable Functions when: the orchestration logic is complex and benefits from code (complex conditional compensation, dynamic fan-out count, tight performance requirements). Logic Apps when: the workflow is visual, involves SaaS connectors (Salesforce, SharePoint), needs non-developer visibility, or the team maintains it without coding. For the claim validation fan-out I chose Durable Functions — the three validation activities ran in parallel, I needed to dynamically decide which validators to call based on claim type, and the compensation logic (if fraud check fails, cancel the other two) was easier in code than in Logic Apps parallel branches." }
    ]
  },

  {
    id: "topic13", num: "13", title: "Azure API Management (APIM)",
    isKey: true,
    keyNote: "★ JD priority — APIM is explicitly listed 3 times. Know policies, MI publish to SB, and App Gateway pattern.",
    oneThing: "APIM is the front door to all our integrations — JWT validation, rate limiting, managed identity auth to backends, and direct Service Bus publishing. Everything that comes in from outside goes through APIM.",
    story: "The architecture on the Insurance project: internet → Application Gateway (WAF) → APIM (Internal VNet mode) → private backends. Zero public endpoints beyond the App Gateway. APIM had three critical policies: validate-jwt for Entra ID token validation checking the roles claim, rate-limit-by-key at 100 calls per minute per subscription, and for our high-volume policy event endpoint — a send-request publishing directly to Service Bus using the APIM managed identity. That last one eliminated a relay Function App and cut latency in half.",
    terms: [
      ["validate-jwt", "APIM policy: validate JWT Bearer token, check audience, issuer, and required claims. Returns 401 if invalid."],
      ["rate-limit-by-key", "Throttle by subscription, IP, or any key. Returns 429 with Retry-After header when exceeded."],
      ["Named Value / KV Reference", "Store secrets in Key Vault, reference in policy as {{my-secret}}. Rotation happens in KV, policy doesn't change."],
    ],
    apimPolicy: `<!-- Full production policy: JWT + Rate Limit + SB Publish via MI -->
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
        <value>@("{\"MessageId\":\"" + context.RequestId + "\"}")</value>
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
</policies>`,
    deeper: [
      "<strong>Internal vs External mode:</strong> External = public IP, internet-reachable. Internal = private IP inside VNet only. Pair Internal APIM with Application Gateway (WAF) for enterprise: internet → AppGW → APIM Internal → private backends.",
      "<strong>Policy scopes:</strong> Global → Product → API → Operation. Narrower scope overrides broader. Inbound executes top-down before backend. Outbound executes after backend responds.",
      "<strong>Backend entity:</strong> configure circuit breaker on the backend — if it returns 5xx repeatedly, APIM breaks the circuit and returns a 503 rather than piling on the failing service."
    ],
    qa: [
      { q: "Walk me through the App Gateway + APIM Internal architecture.", a: "Public internet hits Azure DDoS Protection then Application Gateway which has a public IP. App Gateway terminates SSL, applies WAF rules (OWASP 3.2), and forwards to APIM's private VIP. APIM is in Internal mode — no public IP, deployed inside a subnet. APIM applies JWT validation, rate limiting, and routes to backends via private endpoints — Functions, Logic Apps, Service Bus — none of which have public endpoints. Result: only App Gateway faces the internet. All business logic is fully private. NSG requirement: allow GatewayManager service tag on APIM subnet for management plane (ports 65200-65535). I deployed this in Bicep with all NSG rules codified — no manual portal changes." },
      { q: "How do you handle APIM policy secrets securely?", a: "Named Values backed by Key Vault references. In APIM Named Values, instead of storing a secret as plain text, I create a Key Vault reference — APIM fetches the secret at runtime using its Managed Identity (needs Key Vault Secrets User role on the KV). The policy references it as {{my-secret-named-value}}. When the secret rotates in Key Vault, APIM picks up the new value automatically — no policy change, no redeployment. This pattern means zero secrets in policy XML, full audit trail in Key Vault, and rotation is painless." }
    ]
  },

  {
    id: "topic14", num: "14", title: "Integration Architecture Patterns",
    isKey: false,
    oneThing: "The patterns I reach for most: Canonical Model (avoid N×M maps), Content-Based Router (Service Bus topic filters), and the async request-reply pattern (APIM returns 202, client polls a status endpoint).",
    story: "When I joined the Insurance project it had 31 point-to-point XSLT maps in BizTalk — every source connected to every target. I proposed the canonical model: define a standard ClaimEvent schema, write one map per source (source→canonical) and one per target (canonical→target). We went from 31 maps to 10. When a new source was added 6 months later, we wrote 1 map not 5. That's a direct application of the EIP Canonical Data Model pattern.",
    terms: [
      ["Choreography vs Orchestration", "Orchestration = central coordinator controls all steps. Choreography = each service reacts to events independently."],
      ["Saga", "Distributed transaction via compensating actions — if step 3 fails, undo steps 1 and 2."],
      ["Async Request-Reply", "APIM returns 202 + correlation ID immediately. Client polls status endpoint. Processing happens asynchronously."],
    ],
    deeper: [
      "<strong>Use orchestration when:</strong> complex compensation logic, full audit trail needed, human approval steps. Use Logic Apps or Durable Functions orchestrator.",
      "<strong>Use choreography when:</strong> services must evolve independently, adding a new consumer shouldn't touch producers. Use Service Bus topics + Event Grid.",
      "<strong>Circuit Breaker:</strong> stop calling a failing downstream. APIM backend circuit breaker, or Polly in Function Apps. Prevents cascading failures."
    ],
    qa: [
      { q: "How do you decide between choreography and orchestration?", a: "Orchestration when: the process has complex compensating transactions (if billing fails, reverse inventory), you need a single auditable trace of the full workflow, or you have human approval steps. I use Logic Apps stateful workflows or Durable Functions. Choreography when: services must be independently deployable and evolvable, adding a new consumer of existing events shouldn't modify producers. I use Service Bus topics with filtered subscriptions. Hybrid is common: orchestrate within a bounded context (claim processing), choreograph between bounded contexts (claims → billing → notifications)." },
      { q: "What is the async request-reply pattern and when do you use it?", a: "Client POSTs to APIM. APIM publishes to Service Bus and immediately returns 202 Accepted with a correlation ID and a Location header pointing to a status endpoint. The actual processing happens asynchronously via Logic App or Function App reading from the queue. Client polls the status endpoint (backed by Azure Cache for Redis or CosmosDB where the processor writes its status). When processing completes, the status endpoint returns 200 with the result. I use this whenever processing takes more than 2-3 seconds — prevents client timeouts and makes the system more resilient to backend slowness." }
    ]
  },

  {
    id: "topic15", num: "15", title: "Azure Networking",
    isKey: false,
    oneThing: "My standard pattern for enterprise integration: Hub-and-Spoke VNet with all PaaS resources behind private endpoints. Nothing has a public IP except the Application Gateway.",
    story: "On the Insurance project: Hub VNet held APIM Internal, Azure Firewall, and the VPN Gateway for on-prem connectivity. Spoke VNet held Function Apps (VNet integrated), Logic Apps Standard (VNet integrated), and private endpoints for Service Bus, Key Vault, Storage, and SQL. All cross-spoke traffic was forced through the Azure Firewall via UDR. The result: an attacker compromising the App Gateway could reach APIM but nothing beyond it — zero lateral movement to backends.",
    terms: [
      ["Private Endpoint", "A NIC with private IP in your VNet connected to a PaaS resource. Traffic never leaves your VNet."],
      ["VNet Integration", "Allows App Service / Functions to make outbound calls into a VNet to reach private endpoints."],
      ["NSG", "Network Security Group — stateful firewall rules. Use Service Tags (AzureServiceBus, GatewayManager) not individual IPs."],
    ],
    deeper: [
      "<strong>Private Endpoint vs Service Endpoint:</strong> Private Endpoint = private IP in your VNet, traffic stays in VNet. Service Endpoint = routes traffic to PaaS via Azure backbone but still uses public IP of PaaS service. Use Private Endpoint for production.",
      "<strong>Private DNS Zone:</strong> after adding a private endpoint, create a Private DNS Zone (e.g. privatelink.servicebus.windows.net) linked to the VNet. Resolves the namespace FQDN to the private IP inside VNet.",
      "<strong>APIM NSG rules:</strong> APIM management plane requires inbound from GatewayManager service tag on ports 65200-65535. Without this, APIM goes unhealthy."
    ],
    qa: [
      { q: "How do you secure a Function App so only APIM can call it?", a: "Three layers: (1) Access restrictions on the Function App — only allow APIM's outbound IPs or the APIM subnet if VNet integrated. Deny all other inbound. (2) Remove public access: deploy Function App with private endpoint, APIM calls it via VNet. (3) Function key + Managed Identity: APIM passes the function key as x-functions-key header AND authenticates with MI token. The Function validates the MI token against Entra ID as a second factor. Defense in depth: network layer blocks non-APIM traffic, application layer validates identity even if network is bypassed." },
      { q: "Explain Hub-and-Spoke topology for integration.", a: "Hub VNet = shared services: APIM Internal, Azure Firewall, VPN/ExpressRoute Gateway, Bastion. Spoke VNets = application workloads, peered to Hub. Spoke-Integration: Function Apps, Logic Apps, Service Bus private endpoints. Spoke-Data: SQL private endpoints, Storage private endpoints. Cross-spoke traffic routes through Hub Firewall via UDR — provides centralized inspection. Benefits: one firewall policy, one APIM gateway serving all spokes, one VPN connection for all on-prem connectivity. I deployed this with Bicep — all VNet peerings, UDRs, and NSG rules in code." }
    ]
  },

  {
    id: "topic16", num: "16", title: "Security & Governance",
    isKey: false,
    oneThing: "Zero Trust is the principle: no implicit trust, even inside the network. Every service-to-service call is authenticated. Every credential lives in Key Vault. Every action is logged.",
    story: "On the Insurance project I produced a permissions matrix documenting every service-to-service interaction with the exact RBAC role and scope. Function App → Service Bus: Azure Service Bus Data Receiver on the specific queue (not namespace-wide). Logic App → Key Vault: Key Vault Secrets User on the specific secret (not vault-wide). APIM → Service Bus: Azure Service Bus Data Sender on namespace. That matrix was reviewed in a security assessment and passed with no findings — because everything was in Bicep, peer-reviewed in PRs, not applied ad-hoc in the portal.",
    terms: [
      ["Zero Trust", "Never trust, always verify — no implicit trust from network location. Authenticate every call."],
      ["Azure Policy", "Enforce compliance: deny resources without private endpoints, require tags, enforce TLS 1.2 minimum."],
      ["PIM", "Privileged Identity Management — time-bound, approval-gated elevated access. No permanent Owner/Contributor on production."],
    ],
    deeper: [
      "<strong>Key Vault best practice:</strong> one KV per app per environment (blast radius). Enable soft delete + purge protection. Use RBAC not Access Policies. Log all access to Log Analytics.",
      "<strong>Azure Policy examples for integration:</strong> deny Service Bus without private endpoint, require diagnostic settings on Logic Apps, deny Storage with public access enabled.",
      "<strong>Resource locks:</strong> apply CanNotDelete lock on production resource groups — prevents accidental deletion. Doesn't prevent modification."
    ],
    qa: [
      { q: "How do you implement least-privilege access across an integration solution?", a: "I map every service-to-service interaction and assign the minimum role at the minimum scope. Function App → Service Bus: 'Azure Service Bus Data Receiver' scoped to the specific queue, not the namespace. Logic App → Key Vault: 'Key Vault Secrets User' scoped to the specific secret. APIM → Service Bus: 'Azure Service Bus Data Sender' at namespace level (publish-only). All role assignments are in Bicep — peer reviewed, auditable in git history. For human access: Azure PIM with 4-hour time-bound requests, team lead approval, full action logging. No permanent Contributor or Owner on production subscriptions." },
      { q: "How would you enforce that all Service Bus namespaces must have private endpoints?", a: "Azure Policy with Deny effect. The built-in policy 'Azure Service Bus namespaces should use private link' can be assigned at subscription or management group scope. Effect: Deny prevents creation or update of Service Bus namespaces that don't have private endpoint connections. Combine with a DeployIfNotExists policy to automatically add diagnostic settings when a namespace is created. Assign both as an Initiative (policy set) at the Management Group level so it applies to all subscriptions. Run compliance reports monthly — any non-compliant resource shows up in the Azure Policy compliance dashboard." }
    ]
  },

  {
    id: "topic17", num: "17", title: "Monitoring & Observability",
    isKey: false,
    oneThing: "My observability setup: all diagnostic logs to Log Analytics, Application Insights for distributed traces with correlation IDs, and metric alerts on DLQ depth, failed runs, and APIM 429 rate.",
    story: "When a claim was getting stuck — no error, just not completing — I opened Application Insights and queried by the CorrelationId that was threaded through from APIM to Service Bus to Logic App to Function App. The distributed trace showed the Logic App action that called the SQL Server was taking 45 seconds — the private endpoint DNS resolution was broken after a network change, causing TCP timeout rather than a clean failure. Fixed the DNS zone link, deployed, confirmed in App Insights. Without correlation IDs and distributed tracing, that would have taken hours.",
    terms: [
      ["Log Analytics Workspace", "Central store for all diagnostic logs — query with KQL across all resources."],
      ["Application Insights", "Distributed tracing + APM. Operation ID correlates requests across APIM → Logic App → Function App."],
      ["KQL", "Kusto Query Language. Key tables: AzureDiagnostics, requests, dependencies, exceptions."],
    ],
    deeper: [
      "<strong>Key metrics to alert on:</strong> Service Bus DLQ depth > 0 (critical queues), Logic App Failed Runs > 5 in 5 min, APIM 429 rate > 5%, Function App exception rate spike.",
      "<strong>KQL to find failed Logic App runs in last hour:</strong> AzureDiagnostics | where ResourceType == 'WORKFLOWS' | where status_s == 'Failed' | where TimeGenerated > ago(1h) | project WorkflowName = resource_workflowName_s, RunId = resource_runId_s, ErrorCode = error_code_s",
      "<strong>Tracked properties</strong> in Logic Apps emit custom dimensions to App Insights per action — ClaimId, PolicyNumber. Enables filtering all traces for a specific business entity."
    ],
    qa: [
      { q: "How do you implement end-to-end distributed tracing across APIM → Service Bus → Logic App → Function App?", a: "Three steps: (1) APIM: enable App Insights integration on the instance. Set x-correlation-id = context.RequestId in inbound policy. Add it as a BrokerProperty on every Service Bus message. (2) Logic App: enable App Insights diagnostic settings. Configure tracked properties on key actions to emit CorrelationId, ClaimId as custom dimensions. (3) Function App: APPLICATIONINSIGHTS_CONNECTION_STRING configured. Extract CorrelationId from Service Bus message custom properties and set as ILogger scope property — Functions SDK propagates it to all telemetry. Result: in App Insights, query by Operation ID or CorrelationId and see the full chain as a dependency tree." },
      { q: "What KQL query would you use to monitor Service Bus health?", a: `AzureDiagnostics
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
| project TimeGenerated, ResourceName = Resource, DLQDepth = Maximum` }
    ]
  },

  {
    id: "topic18", num: "18", title: "DevOps & IaC",
    isKey: false,
    oneThing: "Everything in code, everything in git, nothing clicked in the portal. Bicep for infrastructure, GitHub Actions with OIDC for deployment — no stored Azure credentials anywhere.",
    story: "On the Insurance project I set up APIOps — the Azure APIM DevOps toolkit — so all APIM APIs, policies, and products were extracted to a Git repository. When a developer added a new API, they raised a PR. The pipeline ran a policy linter, validated the policy XML, got team lead approval, and applied to Dev automatically then Prod on manual gate. When an incident required a policy rollback, it was a git revert and a pipeline run — 5 minutes.",
    terms: [
      ["Bicep", "Azure IaC DSL that compiles to ARM JSON. Readable, modular, type-safe. Always use what-if before prod."],
      ["OIDC Federated Credential", "GitHub Actions authenticates to Azure with no stored client secret — Workload Identity Federation."],
      ["APIOps", "GitOps for APIM: extract all API config to Git, apply via CI/CD pipeline. Enables PR-based policy review."],
    ],
    deeper: [
      "<strong>Logic Apps Standard deployment:</strong> zip the workflow project folder, deploy with az logicapp deployment source config-zip. Connections reference MI — no environment-specific credentials.",
      "<strong>Bicep what-if:</strong> az deployment group what-if before every production deployment — shows exactly what will be created, modified, deleted. Never skip this.",
      "<strong>Slot swap:</strong> deploy Logic Apps / Function Apps to staging slot, run smoke tests, then swap. Zero-downtime deployment with instant rollback capability."
    ],
    qa: [
      { q: "How do you deploy Logic Apps Standard via CI/CD without credentials in the pipeline?", a: "GitHub Actions with OIDC Federated Credential. Create an App Registration in Entra ID, add a Federated Credential for the specific GitHub repo and branch. In the Actions workflow: azure/login with client-id and tenant-id — no client-secret. The workflow zips the Logic App project (workflow JSON files + connections.json + host.json) and runs az logicapp deployment source config-zip. Connections.json uses managed identity references — no environment-specific credentials in the zip. App Settings (environment-specific config) are deployed via Bicep in the same pipeline run before the zip deploy." }
    ]
  },

  {
    id: "topic19", num: "19", title: "BizTalk Migration",
    isKey: true,
    keyNote: "★ This is your strongest differentiator. 7 years of BizTalk + you've done the migration. Own this topic.",
    oneThing: "I've lived BizTalk for 7 years and spent 3 years migrating it to Azure. When they ask about hybrid integration or legacy, this is where I have an unfair advantage.",
    story: "I assessed 147 BizTalk artifacts across 23 applications — orchestrations, maps, custom pipeline components, EDI trading partners. I risk-stratified them: 12 simple (straight port to Logic Apps), 7 medium (pattern redesign needed), 4 complex (Durable Functions for compensation logic). Built the Azure platform first — Hub-and-Spoke networking, Service Bus Premium, APIM with WAF, IaC in Bicep, APIOps CI/CD. Then migrated in waves. Ran BizTalk and Azure in parallel for 6 weeks with automated semantic output comparison. Zero production incidents at cutover.",
    terms: [
      ["BizTalk Orchestration → Logic App", "Stateful workflow. Receive shape → SB trigger. XSLT map → Transform XML. Correlation set → SB Session."],
      ["BizTalk Pipeline → Function App", "Data processing stages, custom components → Azure Function with processing logic."],
      ["On-Premises Data Gateway", "Agent on-prem server connects outbound to Azure Relay. No inbound firewall rules. Logic Apps uses for SQL, File, SAP."],
    ],
    deeper: [
      "<strong>What replaces what:</strong> Orchestration→Logic App Stateful, Pipeline→Function, Map (XSLT)→XSLT in Integration Account, Schema (XSD)→JSON Schema or XSD in Standard, Adapter→Logic App connector, Send Port→HTTP/SB action, Receive Location→Trigger, Suspend Queue→DLQ, BizTalk Admin→Azure Monitor + Run History.",
      "<strong>Custom functoids</strong> that use .NET assemblies cannot be auto-converted — they become Azure Function calls from the Logic App workflow.",
      "<strong>AS2/EDIFACT/X12:</strong> Logic Apps Integration Account handles B2B protocols natively. Standard tier can hold maps and schemas directly without an Integration Account for simpler scenarios."
    ],
    qa: [
      { q: "How do you approach a BizTalk to Azure migration assessment?", a: "Start with artifact inventory — query BizTalk Management DB to list all applications, orchestrations, schemas, maps, send/receive ports, adapters. Flag custom pipeline components (need rewrite as Function Apps), custom functoids (same), EDI agreements (need Integration Account). Then risk-stratify: Simple = no custom components, standard adapters, straightforward orchestration logic. Medium = some customisation, non-standard adapter, complex routing. Complex = custom .NET assemblies, high-throughput requirements, complex compensation logic. Pilot with one of each complexity level to validate your patterns before scaling. Build the Azure platform first — networking, Service Bus, APIM, CI/CD. Then migrate in waves, running parallel for 2-6 weeks per wave with automated comparison." },
      { q: "How does the On-Premises Data Gateway work?", a: "Install the gateway agent on a Windows server on-premises. The agent establishes an outbound HTTPS connection to Azure Service Bus Relay — no inbound firewall changes needed. When a Logic App action (e.g., SQL Server connector with on-prem connection) fires: the request goes from Logic App → Azure relay service → gateway agent → local SQL Server → response back through relay → Logic App. For HA: install on 2+ servers and create a cluster — Azure load-balances. Latency: adds 20-100ms depending on network quality. For very high-frequency queries, ExpressRoute with private endpoints is better. I used the gateway on the Insurance project for an on-prem SQL Server that couldn't be migrated in the first wave." }
    ]
  },

  {
    id: "topic20", num: "20", title: "AI Pipeline",
    isKey: true,
    keyNote: "★ This is uniquely yours. No other candidate will have this story. Lead with it when they ask about innovation.",
    oneThing: "I designed and delivered a 5-stage Azure AI enrichment pipeline for client financial data profiling — this was one of the first production LLM integrations in our practice.",
    story: "The client had financial profiles aggregated from 5 systems with inconsistent quality. I built a sequential pipeline: Stage 1 — Pattern Detection (regex coverage per field). Stage 2 — PII Detection (Azure AI Language, category + confidence per entity). Stage 3 — Anomaly Detection (Azure Anomaly Detector, statistical outlier flagging). Stage 4 — Rule Checking (47 business policy rules, violation array). Stage 5 — Quality Scoring (0-100 composite score stored as JSONB in PostgreSQL). Each stage was a Function App triggered by Service Bus. Failures isolated per stage — stage 3 failing didn't stop stage 4 on other records. Full audit trail. The ML team filtered to quality score > 70 and saw 18% model accuracy improvement.",
    terms: [
      ["RAG", "Retrieval-Augmented Generation — embed query, retrieve relevant docs from AI Search, combine with LLM prompt. Prevents hallucination."],
      ["Spec-Driven Development", "Write a precise spec first (Claude helps), implement against it (Copilot accelerates). Reduced design-to-code time ~40%."],
      ["Azure AI Language", "PII entity recognition, sentiment, key phrase extraction. Used for PII detection stage in the pipeline."],
    ],
    deeper: [
      "<strong>Azure OpenAI integration in Logic Apps:</strong> HTTP action to Azure OpenAI completions endpoint, authenticate with APIM MI (Cognitive Services OpenAI User role). Compose the prompt in a prior Compose action.",
      "<strong>Spec-driven approach:</strong> I used Claude to decompose requirements into stage-by-stage input/output schemas and error handling specs. GitHub Copilot then implemented each Function against the spec. The spec became the test contract.",
      "<strong>Fault tolerance:</strong> each stage had independent retry (exponential backoff × 3), DLQ fallback, and a stage_status column in the output table so you could query 'all records stuck at stage 3'."
    ],
    qa: [
      { q: "Tell me about your AI pipeline in detail.", a: "I built a 5-stage sequential enrichment pipeline for client financial document processing at EY. Each stage ran as an Azure Function triggered by a dedicated Service Bus queue, consuming the previous stage's output from PostgreSQL JSONB. Stage 1: regex pattern coverage analysis per field, producing coverage_score. Stage 2: Azure AI Language PII detection on free-text fields — category (PersonName, IBAN, Address) and confidence score per entity. Stage 3: Azure Anomaly Detector on numeric time-series fields — isAnomaly flag and severity. Stage 4: 47 business rule checks producing a violations array. Stage 5: weighted composite quality score 0-100. The ML team used score > 70 as a quality filter and saw 18% improvement in model accuracy. The pipeline processed 2 million records over 3 weeks." },
      { q: "How would you integrate Azure OpenAI into an existing Logic Apps workflow?", a: "Simple path: HTTP action in Logic App calling Azure OpenAI REST API. APIM MI needs 'Cognitive Services OpenAI User' role on the Azure OpenAI resource. Compose the request body — system prompt + user message constructed from prior workflow outputs. Parse the JSON response to extract choices[0].message.content. For RAG: Logic App → Function App (orchestrates: embed query → Azure AI Search → retrieve chunks → compose prompt → OpenAI → return answer). The Function handles multi-step retrieval; Logic App handles the business routing and retry. Rate limit awareness: implement retry with exponential backoff on 429 responses — Azure OpenAI has TPM (tokens per minute) and RPM (requests per minute) limits per deployment." }
    ]
  }

];

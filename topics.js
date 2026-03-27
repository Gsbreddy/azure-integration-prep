const TOPICS = {
  topic5: {
    id: "topic5", num: "05", title: "Azure Storage", day: "THU",
    badge: "active", badgeLabel: "IN PROGRESS",
    desc: "Blob, Queue, Table, Disk, connections via MI — storage in integration architectures.",
    concepts: [
      { title: "Blob Storage", body: "Azure Blob Storage is object storage for unstructured data (files, images, logs, backups). Organised as: Storage Account → Containers → Blobs. Three tiers: Hot (frequent access, higher storage cost), Cool (infrequent, 30-day min), Archive (rare, hours rehydration, cheapest storage). Blob types: Block (files, default), Append (logs), Page (VHD). Access: anonymous, SAS token, Managed Identity. In integration: Logic Apps write output files to Blob, Function Apps are triggered by blob creation events (Blob trigger), Event Grid fires events on blob create/delete for event-driven pipelines." },
      { title: "Queue Storage vs Service Bus", body: "Azure Queue Storage is simple, cheap queue: messages up to 64KB, 7-day TTL, no ordering guarantee, no pub-sub. Good for simple task distribution. Azure Service Bus queues: up to 100MB messages, 14-day TTL, sessions for ordering, DLQ, duplicate detection, pub-sub via topics. Rule: use Queue Storage when you need simple cheap decoupling with no ordering or advanced features. Use Service Bus when you need reliability, DLQ, pub-sub, sessions, or large messages. I used Service Bus exclusively on the Insurance project — the advanced features (DLQ, sessions, duplicate detection) were essential for reliable claims processing." },
      { title: "SAS Tokens & Access Control", body: "Shared Access Signature grants time-limited, scoped access without sharing account keys. Three types: Account SAS (broad), Service SAS (single service), User Delegation SAS (backed by Entra ID — most secure). SAS URL = storage endpoint + resource path + sv (version) + st (start) + se (expiry) + sp (permissions) + sig (HMAC signature). Best practice: prefer Managed Identity over SAS for internal Azure-to-Azure access. Use SAS for external partner access with minimum permissions and short expiry. Store SAS generation logic in Azure Functions, never embed static SAS in config." },
      { title: "Storage in Integration Architecture", body: "Storage Account is the backbone of Azure Integration Services: Logic Apps Standard uses Storage Account for workflow state, run history, and artifact storage. Azure Functions on Consumption/Premium needs a Storage Account for coordination and scale. APIM can cache responses to Blob. Event Hub Capture writes streaming data to Blob or Data Lake. Integration Account (for EDI/B2B) stores maps and schemas in backed storage. Always use Managed Identity for Function/Logic App to Storage connections rather than connection strings." }
    ],
    terms: [
      ["Blob Storage", "Object storage for unstructured data (files, images, logs)"],
      ["Container", "Logical grouping of blobs within a storage account"],
      ["Hot/Cool/Archive", "Access tiers — trade storage cost vs retrieval cost/latency"],
      ["SAS Token", "Signed URL granting time-limited scoped access to storage"],
      ["LRS/ZRS/GRS", "Redundancy: Local, Zone, Geo — replication options"],
      ["Managed Disk", "Azure-managed block storage for VMs"],
      ["Table Storage", "NoSQL key-value store — cheap, schemaless, no joins"],
      ["ADLS Gen2", "Azure Data Lake Storage Gen2 — hierarchical namespace for analytics"],
      ["Storage Account", "Top-level namespace — contains blobs, queues, tables, files"],
      ["Lifecycle Policy", "Auto-tier or delete blobs based on age/access patterns"]
    ],
    qa: [
      { q: "How would you connect a Function App to Azure Storage securely without connection strings?", a: "I'd use Managed Identity with RBAC. First, enable the system-assigned managed identity on the Function App. Then assign the 'Storage Blob Data Contributor' role to that identity on the storage account (or specific container for least-privilege). In the Function App configuration, instead of a connection string, set AzureWebJobsStorage__accountName to the storage account name and AzureWebJobsStorage__credential to 'managedidentity'. The Functions runtime then acquires a token automatically using the MI. For Logic Apps Standard, the same approach applies — set the storage connection to use managed identity in the workflow connection settings. This eliminates any storage keys from config and makes key rotation a non-event." },
      { q: "What is the difference between Blob triggers in Azure Functions and Event Grid blob events?", a: "Both react to blob creation, but differently. Azure Functions Blob trigger polls the storage container on a schedule (every few seconds) — it has latency of up to 10 minutes in worst case for new blobs, and on Consumption plan may miss events if the function is scaled to zero. Event Grid blob events are true event-driven: Azure Storage emits events to Event Grid instantly on blob create/delete, which then pushes to your Function App via Event Grid trigger — sub-second latency, no polling. For production integration pipelines I always use the Event Grid trigger pattern: configure Event Grid system topic on the storage account, subscribe the Function App endpoint as a handler. This is more reliable, faster, and scales better. I used this on the Insurance project for document processing — claims PDFs uploaded to Blob → Event Grid → Function App transformation." },
      { q: "How do you implement blob lifecycle management for an integration solution?", a: "Azure Blob Lifecycle Management policies automate tier transitions and deletion based on rules. I define policies as JSON: move blobs to Cool after 30 days of no access, Archive after 90 days, delete after 365 days. In integration scenarios this is critical for cost management — Logic Apps run history blobs, Function App log blobs, and integration payload archives can accumulate rapidly. I apply lifecycle policies to separate containers: processed-payloads container gets Archive after 30 days, error-payloads stay Hot for 90 days for reprocessing access, then Archive. Apply via Bicep or ARM template in IaC pipelines to ensure consistent policy across environments. Monitor storage costs monthly via Azure Cost Management with storage account resource tags for chargeback." }
    ],
    diagram: `Storage Account (Standard_LRS / ZRS / GRS)
├── Blob Service
│   ├── Container: integration-payloads (Hot)
│   ├── Container: processed-archive (Cool → Archive)
│   └── Container: error-blobs (Hot, 90-day retention)
├── Queue Service (simple task queue, 64KB max)
├── Table Service (NoSQL audit log, correlation tracking)
└── File Service (SMB shares for legacy adapters)

Logic Apps Standard ──(MI)──→ Storage (state, history)
Function Apps       ──(MI)──→ Storage (host coordination)
APIM                ──────→ Blob (cache, export)
Event Hub Capture   ──────→ Blob/ADLS (stream archival)`
  },

  topic6: {
    id: "topic6", num: "06", title: "Messaging Concepts", day: "THU",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Queue vs Pub-Sub, idempotency, at-least-once delivery, retry, DLQ — the foundation of reliable messaging.",
    concepts: [
      { title: "Queue vs Pub-Sub", body: "Queue pattern: one producer, one consumer per message (competing consumers). Messages consumed by exactly one worker. Good for task distribution, load levelling. Pub-Sub (Publish-Subscribe): one producer, many consumers independently receive every message. In Azure: Service Bus Queues = queue pattern; Service Bus Topics + Subscriptions = pub-sub. Event Grid = pure pub-sub for events. Event Hub = pub-sub for high-volume streams. In the Insurance project: claims were queued (only one processor should handle each claim), but policy status updates used topics so multiple downstream systems (billing, CRM, portal) each received their own copy." },
      { title: "Idempotency", body: "Idempotency = same operation applied multiple times = same result as applying once. Critical because messaging systems guarantee at-least-once delivery — duplicates happen during network failures, broker restarts, or consumer crashes. Implementation: every message carries a unique MessageId. Consumer maintains a processed-IDs store (Redis, SQL deduplication table). On receipt, check: already processed? → skip. Not seen? → process and record. Service Bus has built-in duplicate detection (up to 10 minutes window) — enable it on queues/topics. For database operations, use UPSERT (insert or update based on message ID) rather than INSERT to be naturally idempotent." },
      { title: "Retry Patterns & Dead-Letter Queue", body: "Retry: when processing fails, the broker re-delivers the message after a lock timeout. Service Bus: MaxDeliveryCount determines how many times a message is retried. After MaxDeliveryCount attempts, the message is moved to the Dead-Letter Queue (DLQ). DLQ is a sub-queue ($DeadLetterQueue suffix) that holds poison messages for manual investigation. Always monitor DLQ depth as a key operational metric. Exponential backoff: don't retry immediately — wait 1s, 2s, 4s, 8s... to avoid thundering herd. In application retry logic: use Polly (C#) or equivalent with jitter. Service Bus lock duration must exceed your max processing time or the message re-appears." },
      { title: "Message Ordering", body: "Service Bus standard queues/topics: best-effort FIFO, no strict ordering guarantee. For strict ordering: use Service Bus Sessions. Assign a SessionId to related messages (e.g., all messages for customer X get the same SessionId). The session-enabled queue delivers all messages for a session to one consumer at a time in order. Event Hub: ordering guaranteed within a partition. Messages with the same partition key always go to the same partition, delivered in order. At a global level, ordering across partitions is not guaranteed. Design: only require ordering within a business entity (order, customer, claim) — use the entity ID as the session/partition key." }
    ],
    terms: [
      ["Queue", "FIFO buffer: one producer, one consumer per message"],
      ["Pub-Sub", "One message → many independent subscribers"],
      ["Idempotency", "Same operation N times = same result as once"],
      ["At-least-once", "Guaranteed delivery, may duplicate — requires idempotent consumers"],
      ["Exactly-once", "No duplicates, no loss — complex, usually via transactions"],
      ["DLQ", "Dead-Letter Queue — holds undeliverable/poison messages"],
      ["MaxDeliveryCount", "Max retries before message goes to DLQ"],
      ["Lock Duration", "Time a consumer has to process before message re-appears"],
      ["Session", "Service Bus feature for ordered, grouped message processing"],
      ["Competing Consumers", "Multiple workers reading from same queue for scale-out"]
    ],
    qa: [
      { q: "How do you ensure exactly-once processing in a messaging system?", a: "True exactly-once is expensive and often unnecessary — at-least-once with idempotent consumers is the practical standard. That said, Service Bus supports transactions: you can receive a message and send to another queue atomically within a transaction scope, so either both happen or neither. For database writes, combine Service Bus peek-lock with a database transaction: receive message (peek-lock), write to DB including the MessageId as a dedup key (unique constraint), complete the message within the same transaction scope. If DB write fails, the lock expires and the message is redelivered — but if it's a duplicate, the unique constraint causes the DB write to fail with a known error, which you handle by completing the message (it was already processed). This gives idempotent processing that's effectively exactly-once from a business perspective." },
      { q: "Walk me through your DLQ strategy in production.", a: "I treat DLQ as a first-class operational concern, not an afterthought. In production: first, always monitor DLQ depth with Azure Monitor alerts — a growing DLQ indicates a systematic processing failure. Second, every DLQ message is enriched with dead-letter reason and description properties by Service Bus, so you can diagnose without retrieving the original payload. Third, I deploy a DLQ reprocessing workflow — a Logic App that reads from DLQ on a schedule, logs to Application Insights with full payload and reason, optionally retries to the main queue after manual triage, or routes to an error storage container for audit. The DLQ message TTL defaults to the source queue TTL — don't let it expire before you can triage. I set DLQ message TTL to 14 days (max) and set monitor alerts at depth > 0 for payment queues, > 10 for lower-priority queues." },
      { q: "What is the difference between message TTL and lock duration in Service Bus?", a: "Two completely different concepts. Message TTL (TimeToLive): how long the message exists in the queue before expiring and moving to DLQ. Set on the queue (default) or per-message override. After TTL, unprocessed messages are dead-lettered. Lock Duration: how long a consumer has exclusive ownership of a message after receiving it (peek-lock mode). During this window, no other consumer can see the message. If the consumer crashes or takes longer than lock duration, the lock expires and the message becomes visible again for redelivery. Lock duration must be set longer than your worst-case processing time. If processing takes up to 2 minutes, set lock to 5 minutes. If processing is unpredictable, renew the lock programmatically during processing. Critical: if lock duration is too short, you'll see messages processed multiple times even though your consumer is working correctly." }
    ],
    diagram: `QUEUE PATTERN (Service Bus Queue)
Producer ──→ [Queue] ──→ Consumer A (gets message)
                     ──→ Consumer B (competing, doesn't get this one)
                     ──→ Consumer C (competing, doesn't get this one)

PUB-SUB PATTERN (Service Bus Topic)
Producer ──→ [Topic] ──→ [Subscription: Billing]   ──→ Billing Service
                     ──→ [Subscription: CRM]       ──→ CRM Service
                     ──→ [Subscription: Portal]    ──→ Portal Service
(ALL subscribers get their own copy)

RETRY + DLQ FLOW
Message received → Process → Success → Complete (removed)
                           → Failure → Lock expires → Redelivered
                                     → After MaxDeliveryCount → DLQ`
  },

  topic7: {
    id: "topic7", num: "07", title: "Azure Service Bus", day: "THU",
    badge: "pending", badgeLabel: "PENDING",
    desc: "The enterprise messaging backbone — queues, topics, sessions, DLQ, APIM integration.",
    concepts: [
      { title: "Namespace, Queues, Topics, Subscriptions", body: "Service Bus Namespace is the top-level container — like a server. Inside: Queues (point-to-point, FIFO, competing consumers) and Topics (pub-sub, each Topic has 1+ Subscriptions). Each Subscription gets its own copy of every message published to the Topic. Subscriptions can have filters: SQL filters (topic-level routing) or Correlation filters (match on properties). Example: 'env = production AND priority = high'. Tiers: Basic (queues only, no topics), Standard (topics, 256KB max), Premium (topics, 100MB messages, dedicated, zone-redundant, private endpoints)." },
      { title: "Sessions for Ordered Processing", body: "Sessions enable grouped, ordered message delivery. Set SessionId on messages to group related messages (e.g., all messages for OrderId=123). Session-enabled queue/topic subscription delivers all messages for a session to ONE consumer at a time, in order. Consumer opens a session receiver, processes all messages for that session, then closes. Another consumer can then take the next available session. Use cases: multi-step workflows where Step 2 must see Step 1 output, financial transactions, saga orchestration where order matters. On the Insurance project I used sessions for claim amendment sequences — original + 3 amendments had to be processed in order." },
      { title: "APIM → Service Bus via Managed Identity", body: "Classic pattern: APIM receives HTTP POST from client, publishes to Service Bus without a backend service. In APIM inbound policy: use send-request to call Service Bus REST API (https://namespace.servicebus.windows.net/queue/messages) with a Bearer token obtained from the APIM Managed Identity. The APIM Managed Identity needs 'Azure Service Bus Data Sender' role on the namespace. Policy uses authentication-managed-identity element to fetch the token automatically. This pattern eliminates the need for a Function App as a relay and reduces latency. Key: the policy must set Content-Type, BrokerProperties header (for MessageId, SessionId), and the correct REST API path." },
      { title: "Duplicate Detection & Filters", body: "Duplicate detection: enable on queue/topic, set detection window (1min–7days). Service Bus tracks MessageId hashes and rejects duplicates within the window. Always set a meaningful MessageId on every message — use a business correlation ID (ClaimId, OrderId). Topic filters: SQL filter expressions on message properties, system properties, and body. Example: 'Department = Claims AND Priority > 5'. Correlation filter (faster, uses index): match on CorrelationId, To, From, Label, SessionId, ReplyTo, MessageId properties — binary comparison, much faster than SQL filter. Use correlation filters for high-throughput scenarios, SQL filters for complex routing logic." }
    ],
    terms: [
      ["Namespace", "Top-level Service Bus container — holds queues and topics"],
      ["Queue", "Point-to-point FIFO — competing consumers"],
      ["Topic", "Pub-sub — fan-out to multiple subscriptions"],
      ["Subscription", "Named consumer of a topic — gets its own copy"],
      ["SessionId", "Groups related messages for ordered processing"],
      ["DLQ", "Dead-letter sub-queue for undeliverable messages"],
      ["MaxDeliveryCount", "Retries before dead-lettering (default 10)"],
      ["PeekLock", "Receive and lock — consumer must complete/abandon"],
      ["ReceiveAndDelete", "Destructive receive — no retry on consumer crash"],
      ["Duplicate Detection", "Reject messages with duplicate MessageId within time window"],
      ["MessagingUnit", "Premium tier compute unit — scale independently"],
      ["Geo-DR", "Namespace alias with metadata replication to secondary region"]
    ],
    qa: [
      { q: "How would you implement APIM publishing directly to Service Bus using Managed Identity?", a: `Enable Managed Identity on the APIM instance (system-assigned). Grant the MI 'Azure Service Bus Data Sender' role on the Service Bus namespace via RBAC. In the APIM API operation's inbound policy:

<policies>
  <inbound>
    <set-variable name="body" value="@(context.Request.Body.As<string>(preserveContent: true))"/>
    <send-request mode="new" response-variable-name="sbResponse" timeout="20" ignore-error="false">
      <set-url>https://YOUR-NS.servicebus.windows.net/YOUR-QUEUE/messages</set-url>
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
  </inbound>
</policies>

This eliminates the relay Function App, reduces latency by ~50ms, and removes one failure point. I implemented this pattern on the Insurance project for high-volume policy event ingestion.` },
      { q: "What's the difference between Standard and Premium Service Bus tiers?", a: "Standard: shared infrastructure, variable performance, max 256KB message size, no private endpoints, no zone redundancy. Premium: dedicated infrastructure (messaging units), predictable performance, up to 100MB messages, private endpoints for VNet integration, zone redundancy, Geo-Disaster Recovery pairing. For enterprise production integration I always specify Premium. The dedicated infrastructure means SLA is predictable — you can scale by adding messaging units. Private endpoints are non-negotiable for financial or healthcare clients where data must not traverse public internet. The cost difference is real but justified by the SLA and security guarantees. I sized the Insurance project at 4 messaging units initially, monitored CPU and memory, and found 2 sufficient for steady-state, autoscaling to 4 during EOD batch processing." },
      { q: "How do you monitor Service Bus in production and what metrics matter most?", a: "Key metrics via Azure Monitor: Incoming Messages (volume baseline), Outgoing Messages (consumer throughput), Active Messages (queue depth — growing depth = consumer falling behind), Dead-lettered Messages (alert at > 0 for critical queues), Server Errors (broker-side issues), User Errors (client-side issues like auth failures), Redelivered Messages (retry rate), Server Send Latency. I set metric alerts: queue depth > 1000 for 5 minutes → alert (consumer lag), DLQ depth > 0 for payment queues → immediate alert. For distributed tracing: Service Bus operations appear in Application Insights as dependencies if you pass the diagnostic tracing headers. I link Logic App run IDs to Service Bus MessageIds via custom application properties, so I can trace: APIM request → Service Bus message → Logic App run → Function execution — end-to-end in one App Insights query." }
    ],
    diagram: `Service Bus Namespace (Premium)
├── Queue: claims-inbound
│   ├── MaxDeliveryCount: 5
│   ├── LockDuration: 5min
│   ├── DuplicateDetection: 10min window
│   └── $DeadLetterQueue
├── Topic: policy-events
│   ├── Subscription: billing-sub  (filter: EventType='RenewalDue')
│   ├── Subscription: crm-sub      (filter: all)
│   └── Subscription: portal-sub   (filter: Priority > 5)
└── Topic: claim-updates (sessions enabled)
    └── Subscription: processor-sub

APIM → (MI Bearer Token) → Service Bus REST API → Queue
Logic App (SB Trigger) ← Queue ← Message
Function App ← Queue ← Message (parallel consumers)`
  },

  topic8: {
    id: "topic8", num: "08", title: "Azure Event Grid", day: "THU",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Event-driven architecture, topics, subscriptions, handlers — the reactive backbone of Azure.",
    concepts: [
      { title: "Event Grid Architecture", body: "Event Grid is a fully managed event routing service — it connects event sources to event handlers with push delivery. Sources: Azure services (Blob Storage, Resource Manager, Service Bus, Container Registry, etc.) via System Topics, or your own application events via Custom Topics or Event Grid Namespaces. Handlers: Azure Functions, Logic Apps, Event Hubs, Service Bus, Webhooks, Azure Relay, Storage Queues. Event Grid delivers events with retry (exponential backoff up to 24 hours by default). Events are small (max 1MB per event), schema-based (Event Grid Schema or CloudEvents 1.0 schema). This is distinct from Service Bus (messaging/commands) and Event Hub (streaming)." },
      { title: "Event Grid vs Service Bus vs Event Hub", body: "Event Grid: event notification, discrete events, push to many handlers, low latency, no ordering, no persistence beyond retry window. Use for: Azure resource events, reactive automation, fan-out notifications. Service Bus: reliable messaging, commands, business transactions, ordering (sessions), DLQ, long TTL. Use for: workflow steps, business process integration, guaranteed delivery. Event Hub: high-volume event streaming, retention and replay (up to 90 days), ordered within partition, consumer groups for multiple independent consumers. Use for: telemetry, IoT, log ingestion, stream processing. Common pattern: IoT device → Event Hub (ingest millions/sec) → Stream Analytics (process) → Event Grid (notify on anomaly) → Logic App (remediation)." },
      { title: "Event Grid Security", body: "Webhook validation: Event Grid sends a validation request to your webhook endpoint before delivering events — your endpoint must return the validationCode. This prevents delivery to unauthorized endpoints. Access control: SAS keys on custom topics, or Managed Identity (publish events from Azure resources using MI without keys). Event subscriptions can filter by event types and subject prefix/suffix — only matching events are delivered. Dead-lettering: configure a Storage Blob container as a dead-letter destination — events that fail all retries are written there. Always configure dead-lettering on production subscriptions." }
    ],
    terms: [
      ["System Topic", "Event Grid topic auto-created by Azure services (Storage, Resource Manager)"],
      ["Custom Topic", "Your own event source published to Event Grid"],
      ["Event Subscription", "Route events from a topic to a handler with optional filters"],
      ["CloudEvents", "CNCF open event schema — preferred over Event Grid schema"],
      ["Push Delivery", "Event Grid pushes events to handlers (vs pull in Service Bus)"],
      ["Dead-letter", "Failed events written to Blob Storage after retry exhaustion"],
      ["Filter", "Event type, subject prefix/suffix matching on subscription"],
      ["Webhook Validation", "Handshake confirming handler endpoint ownership"],
      ["Event Domain", "Manage thousands of topics as a single resource"],
      ["Retry Policy", "Max retries (18 default) with exponential backoff over 24h"]
    ],
    qa: [
      { q: "When would you choose Event Grid over Service Bus?", a: "Event Grid is for event notification — something happened, tell interested parties. Service Bus is for reliable command messaging — do this thing, guarantee delivery, support retries and DLQ. I choose Event Grid when: the event is a notification of state change (blob created, resource deployed, policy updated), multiple handlers need to react independently, events are small and discrete, and I don't need guaranteed ordering or long retention. I choose Service Bus when: the message represents a command or business transaction, I need DLQ and dead-letter analysis, ordering matters (sessions), message size is large, or the consumer needs to process at its own pace (queue depth as backpressure). Typical pattern in the Insurance project: Blob Storage upload event → Event Grid → Logic App (fan-out to notify multiple teams) for notifications; claims processing command → Service Bus queue → Function App for reliable transactional processing." },
      { q: "How do you implement dead-lettering in Event Grid?", a: "Event Grid dead-lettering is configured on the event subscription, not the topic. You specify a Storage Account and container as the dead-letter destination. When an event fails all retry attempts (up to 18 retries over 24 hours), Event Grid writes the event to that blob container with metadata about why delivery failed. To implement: when creating the subscription via Bicep/ARM or portal, set deadLetterDestination property with the storage account resource ID and container name. Assign the Event Grid managed identity 'Storage Blob Data Contributor' role on that storage account. Monitor by setting an Azure Monitor alert on the dead-lettered event count metric. In production I also deploy a Logic App that watches the dead-letter container for new blobs and triggers an alert workflow — critical for catching silent delivery failures that would otherwise go unnoticed." }
    ],
    diagram: `EVENT GRID ARCHITECTURE

Sources (Publishers)                     Handlers (Subscribers)
─────────────────────                    ─────────────────────
Azure Blob Storage ──┐                ┌─→ Azure Function App
Azure Resource Mgr──┤                 ├─→ Logic App
Custom App (HTTP) ──┤──[Event Grid]──┤──→ Event Hub
Service Bus      ──┘                  ├─→ Service Bus Queue
                                      ├─→ Webhook (any HTTPS)
                                      └─→ Azure Relay

Event flow:
1. Source publishes event to topic
2. Event Grid fans out to all matching subscriptions
3. Delivery attempted with exponential retry (24h window)
4. Failed events → dead-letter blob container`
  },

  topic9: {
    id: "topic9", num: "09", title: "Azure Event Hub", day: "THU",
    badge: "pending", badgeLabel: "PENDING",
    desc: "High-volume streaming — partitions, consumer groups, retention, Kafka compatibility.",
    concepts: [
      { title: "Event Hub as a Stream", body: "Event Hub is a distributed log — think Apache Kafka but managed. Producers append events to the log; consumers read from any position. Unlike Service Bus (delete on consume), Event Hub retains events for a configurable period (1-7 days Standard, up to 90 days Premium/Dedicated). Multiple consumer groups can read the same data independently — billing system reads from offset 0, analytics reads from offset 0, they don't interfere. This enables replay: re-process historical events by resetting consumer offset. Throughput measured in Throughput Units (Standard) or Processing Units (Premium) — each TU = 1MB/s in, 2MB/s out." },
      { title: "Partitions", body: "Partitions are the unit of parallelism. An Event Hub has 2-32 partitions (set at creation, immutable on Standard). Each partition is an ordered sequence of events. Ordering guaranteed within a partition, not across partitions. Producers assign events to partitions via: partition key (hashed to a partition — same key always same partition), explicit partition ID, or round-robin (default). Consumer parallelism: one consumer group instance per partition maximum — if you have 8 partitions, max 8 parallel consumer instances. Size Event Hub partitions based on peak TPS ÷ per-partition throughput capacity. I used 16 partitions for the telemetry pipeline on the Insurance project (8 consumers at steady state, headroom for burst)." },
      { title: "Consumer Groups & Checkpoint", body: "Consumer Group: a named view of the event stream. Default '$Default' consumer group always exists. Each consumer group maintains its own offset/checkpoint — the position of the last successfully processed event per partition. Checkpointing: after processing an event batch, the consumer checkpoints (saves offset to Azure Storage). If consumer restarts, it resumes from the last checkpoint. Event Processor Host (or Azure.Messaging.EventHubs.Processor) manages this automatically. For Functions (Event Hub trigger), checkpointing is automatic — don't process events out of order or you lose the checkpoint guarantee." },
      { title: "Event Hub Capture", body: "Capture automatically archives streaming data to Azure Blob Storage or ADLS Gen2 in Avro format. Configure capture window: time (every N minutes) or size (every N bytes), whichever first. Path format: {Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}. Useful for: long-term retention beyond 7 days, feeding downstream analytics (Databricks, Synapse), compliance archival. I combined Capture with Azure Databricks on one engagement for near-realtime analytics — Event Hub buffered 5 minutes of telemetry, Capture wrote to ADLS, Databricks Autoloader processed the Avro files." }
    ],
    terms: [
      ["Partition", "Ordered event sequence — unit of parallelism in Event Hub"],
      ["Throughput Unit", "Capacity unit: 1MB/s in, 2MB/s out (Standard tier)"],
      ["Consumer Group", "Named view of stream — independent offset per group"],
      ["Checkpoint", "Saved offset position — resume point after consumer restart"],
      ["Offset", "Position of an event within a partition (0-based integer)"],
      ["Retention", "How long events are kept (1-90 days depending on tier)"],
      ["Capture", "Auto-archive to Blob/ADLS Gen2 in Avro format"],
      ["Kafka Endpoint", "Event Hub compatible with Kafka protocol (drop-in replacement)"],
      ["Event Processor Host", "SDK class managing partition assignment and checkpointing"],
      ["Sequence Number", "Monotonically increasing number per partition"]
    ],
    qa: [
      { q: "When would you use Event Hub vs Service Bus?", a: "The key question is: messaging (commands/transactions) or streaming (telemetry/events)? Event Hub is optimised for massive volume ingestion — millions of events/second, multiple independent readers, replay capability, Kafka compatibility. Service Bus is optimised for reliable message delivery with business semantics — DLQ, sessions, transactions, message TTL, filters. Use Event Hub for: IoT telemetry, application logs, clickstream, sensor data, anything where you have high volume and need multiple independent consumers replaying the data. Use Service Bus for: order processing, claims workflows, payment commands, anything where losing or duplicating a message has business consequences. They complement each other: Event Hub ingests IoT telemetry → Stream Analytics → anomaly detected → Service Bus queue → remediation workflow." },
      { q: "How do partitions affect scaling in Event Hub?", a: "Partitions are the fundamental parallelism unit — you can have at most one active consumer per partition per consumer group. If you have 8 partitions and 16 consumer instances, only 8 will actually receive events; the other 8 are idle standby. If you have 4 consumer instances and 8 partitions, each consumer handles 2 partitions. Partition count is fixed at creation on Standard tier (immutable), so over-provision initially. For Azure Functions Event Hub trigger: the function scales to one instance per partition automatically, up to the partition count. This is why choosing partition count is a critical design decision — set it too low and you hit a hard parallelism ceiling. I set partition count based on: expected peak events/sec ÷ per-partition throughput, with 2x headroom. For a pipeline expecting 5000 events/sec at peak, with each partition handling 1000 events/sec, I'd specify at least 10 partitions." },
      { q: "Explain Event Hub Capture and when you'd use it.", a: "Capture is Event Hub's built-in archival feature — it automatically writes streaming data to Blob Storage or ADLS Gen2 in Avro format on a time or size window trigger. The files are written with a hierarchical path by namespace/eventhub/partition/year/month/day/hour. I use Capture when: (1) I need retention beyond the Event Hub standard 7 days — Capture to cold Blob tier for years; (2) I need to feed analytics tools (Databricks, Synapse) that read from ADLS natively; (3) compliance requires archiving all events. The Avro format preserves Event Hub metadata (offset, sequence number, enqueue time) alongside the event body, which is valuable for replay and audit. Configuration is simple — enable Capture on the Event Hub, set the Blob container, set the time window (5 minutes minimum). Combine with lifecycle management policies on the Blob container for automatic tiering to Cool/Archive to manage cost." }
    ],
    diagram: `EVENT HUB ARCHITECTURE

Producers                 Event Hub Namespace
─────────                 ──────────────────
IoT Devices──┐            ┌─ Partition 0: [e0][e1][e2][e3]...
API Servers──┤──→ [EH]───┤─ Partition 1: [e0][e1][e2]...
Telemetry ──┘            └─ Partition 2: [e0][e1]...

Consumer Groups (independent offsets)
├── $Default → Azure Functions (real-time processing)
├── analytics-cg → Stream Analytics (aggregations)
└── archive-cg → Azure Databricks (batch ML)

Event Hub Capture → ADLS Gen2 (Avro files, 5min windows)
                  → Databricks Autoloader → Delta tables`
  },

  topic10: {
    id: "topic10", num: "10", title: "Logic Apps — Fundamentals", day: "FRI",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Triggers, actions, connectors, Consumption vs Standard — your primary integration tool.",
    concepts: [
      { title: "Consumption vs Standard", body: "Consumption: serverless, per-execution billing, hosted in multi-tenant Azure infrastructure, max 90-day run history, supports only one workflow per app, uses managed connectors for most things. Standard: runs on Azure App Service Plan (dedicated or WS1/WS2/WS3), supports multiple workflows per app, stateful AND stateless workflows, local development with VS Code, VNet integration, ISE replacement, Bring-Your-Own-Storage. On the Insurance project I used Standard exclusively — the multi-workflow capability meant one Logic App app held 15+ related workflows, VNet integration was required for private connectivity to Service Bus and SQL, and local development accelerated the team's productivity significantly." },
      { title: "Triggers", body: "Every Logic App starts with a trigger. HTTP trigger: webhook-style, generates a unique URL, Logic App waits for incoming HTTP POST. Recurrence: schedule-based (every N minutes/hours/days). Service Bus trigger: peek-lock on queue/topic subscription, fires when message arrives. Event Grid trigger: receives Event Grid events. Blob Storage trigger (Event Grid-based in Standard): fires on blob creation. Key: the trigger type determines billing and scale behaviour on Consumption. On Standard, all triggers run within the app's App Service Plan." },
      { title: "Actions & Expressions", body: "Actions are workflow steps: HTTP (call external API), Service Bus (send/receive), SQL, SharePoint, Condition (if/else), Switch, For Each, Until loop, Scope (error handling), Parse JSON (extract typed fields from JSON), Compose (build JSON/objects), Delay, Terminate. Expressions: @{variables('name')}, @{body('ParseJSON')?['field']}, @{utcNow()}, @{guid()}, @{triggerBody()?['property']}. Key pattern: always Parse JSON after receiving a message, then reference strongly-typed fields. Use Compose to build outgoing payloads. Use Variables (Initialize Variable + Set Variable) for stateful values across steps." },
      { title: "Built-in vs Managed Connectors", body: "Built-in connectors (Standard only) run inside the Logic App runtime — lower latency, no extra connector cost: Service Bus, HTTP, Azure Functions, Storage, SQL (built-in). Managed connectors run in the shared connector infrastructure — higher latency, billed per call on Consumption: Salesforce, SharePoint, Office 365, SAP, etc. On Standard, prefer built-in connectors for Azure services — especially Service Bus built-in which is faster and VNet-aware versus the managed connector." }
    ],
    terms: [
      ["Trigger", "First step that starts a workflow — HTTP, timer, SB, Event Grid"],
      ["Action", "Subsequent workflow steps — HTTP calls, conditions, loops"],
      ["Connector", "Pre-built integration to external service (SaaS, Azure service)"],
      ["Workflow Definition Language", "JSON schema defining the Logic App workflow"],
      ["Expression", "Dynamic values using @{} syntax in action inputs"],
      ["Run History", "Record of past workflow executions with inputs/outputs per step"],
      ["Stateful", "Persists run state to Storage — survives restart, has run history"],
      ["Stateless", "In-memory only — faster, no run history, lower cost"],
      ["Integration Account", "Holds B2B artifacts: maps, schemas, partners, agreements"],
      ["Managed Connector", "Runs outside Logic App — higher latency, billed per call"],
      ["Built-in Connector", "Runs inside Logic App runtime — lower latency, included in plan"]
    ],
    qa: [
      { q: "How did you migrate BizTalk orchestrations to Logic Apps?", a: "The migration wasn't a one-to-one translation — it was a redesign opportunity. BizTalk orchestrations are code-heavy, stateful, port-based. Logic Apps are designer-first, declarative, connector-driven. My approach: first map the BizTalk orchestration's receive shape (port binding) to a Logic App trigger — usually a Service Bus trigger since we replaced BizTalk's MSMQ/SQL receive with Service Bus queues. Then map each BizTalk shape to Logic App actions: Transform shapes became built-in Data Mapper or liquid templates, Decision shapes became Condition actions, Loop shapes became For Each or Until actions, Send shapes became Service Bus send or HTTP actions. Exception handling (catch shapes) became Scope + catch block in Logic Apps. The key insight: BizTalk's strong XML/XSD typing maps well to Logic Apps' Parse JSON + JSON Schema validation. I replaced XSLTs with Liquid maps in Standard tier, using the Integration Account for complex canonical transformations. The insurance client had 23 orchestrations; we migrated them to 15 Logic App workflows (some were combined) over 3 months." },
      { q: "What's the difference between stateful and stateless workflows in Logic Apps Standard?", a: "Stateful workflows persist every step's inputs and outputs to Azure Storage (Table + Blob). This enables: run history in the portal, re-run failed runs, audit trail of all data, long-running workflows (up to 1 year). Cost: slower (each step writes to storage), more storage cost. Stateless workflows: all state is in-memory only. No run history. Faster, cheaper. Max run duration: a few minutes (no long waits). Use stateless for: high-throughput, low-latency, short-duration workflows where you don't need audit. Use stateful for: any business process that needs audit trail, could fail and need re-run, involves waiting (delays, human approval), or runs longer than a few minutes. On the Insurance project: all business process workflows (claims, policy) were stateful for audit. Internal event routing workflows (parse and fan-out messages) were stateless for performance." },
      { q: "How do you handle errors in Logic Apps?", a: "Two main patterns: Scope with Run After configuration, and global error handling. Scope action creates a logical group. Set 'Run After' on a separate Scope to execute only when the first scope fails/times out: configure runAfter: {mainScope: [Failed, TimedOut]}. Inside the catch scope: log the error to Application Insights (HTTP action to Log Analytics or App Insights API), send an alert to Service Bus DLQ or Teams, optionally trigger a compensating action. For the Insurance project: every workflow had a main scope and a catch scope. The catch scope extracted the error code and message using @{result('mainScope')[0]['error']['message']}, posted to App Insights with run ID and correlation ID, and sent a message to a 'workflow-errors' Service Bus queue which triggered a separate triage Logic App. For transient failures (HTTP 429, 503), Logic Apps has built-in retry policies per action — configure exponential backoff with up to 10 retries." }
    ],
    diagram: `LOGIC APP STANDARD WORKFLOW STRUCTURE

[Trigger] Service Bus Queue (built-in, peek-lock)
   ↓
[Action] Parse JSON (extract typed fields from message)
   ↓
[Scope: Main Process]
   ├── [Action] Condition (switch on MessageType)
   │     ├── True: [HTTP] Call backend API
   │     └── False: [Service Bus] Route to different queue
   ├── [Action] SQL (update status in DB)
   └── [Action] Service Bus Complete (complete the lock)
   ↓ (on failure)
[Scope: Error Handler] (runAfter: Failed, TimedOut)
   ├── [Action] HTTP → Application Insights (log error)
   ├── [Action] Service Bus → errors-queue (notify)
   └── [Action] Terminate (status: Failed)`
  },

  topic11: {
    id: "topic11", num: "11", title: "Logic Apps — Patterns", day: "FRI",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Advanced runtime patterns, retry, error handling, BizTalk migration patterns.",
    concepts: [
      { title: "Retry Policies", body: "Each action in Logic Apps has a configurable retry policy: None (no retry), Default (4 retries, exponential: 7s, 14s, 28s, 57s), Fixed (every N seconds, N times), Exponential (random backoff between min/max intervals). Configure per-action in the Settings of each action. For HTTP calls to external APIs: use Exponential backoff with jitter — this prevents thundering herd when a downstream is recovering. For Service Bus operations: the built-in connector handles transient errors internally. Best practice: set retry policy to match the SLA of the downstream — if it usually recovers in 30 seconds, 3 retries at 15-second intervals is reasonable." },
      { title: "Integration Account & B2B", body: "Integration Account is required for AS2, EDIFACT, X12 EDI processing and for using XSLT maps and XSD schemas in Logic Apps Consumption. In Standard, maps and schemas can be added directly to the project (no Integration Account required for simple scenarios). Integration Account stores: Trading Partners (B2B partner identities), Agreements (AS2/X12/EDIFACT configuration between partners), Maps (XSLT for transformation), Schemas (XSD for validation), Certificates (for AS2 signing/encryption). SKUs: Free (dev), Basic (B2B lightweight), Standard (full B2B). On the Insurance project the client had AS2 connections to reinsurance partners — I used Standard Integration Account with EDIFACT for policy data exchange." },
      { title: "Monitoring Logic Apps", body: "Run History: available in portal for stateful workflows — shows every trigger and action execution with inputs/outputs. Re-run capability: re-trigger a failed run from the last successful step. Application Insights integration: configure diagnostic settings on the Logic App to send to App Insights. Custom tracking: use the Tracked Properties feature on actions to emit custom dimensions to App Insights (e.g., ClaimId, PolicyNumber). Alerts: set metric alerts on Failed Runs, Throttled Runs, and Action Latency. For high-volume workflows, aggregate metrics in Log Analytics with KQL queries across runs." }
    ],
    terms: [
      ["Scope", "Group of actions with shared error handling and run-after config"],
      ["Run After", "Control flow: execute this action when previous is succeeded/failed/skipped"],
      ["Tracked Properties", "Custom dimensions emitted to App Insights per action"],
      ["Liquid Template", "Mustache-style JSON/XML transformation (alternative to XSLT)"],
      ["XSLT Map", "XML-to-XML transformation using XSL — stored in Integration Account"],
      ["Canonical Model", "Common data format used as intermediary between system schemas"],
      ["Correlation ID", "Unique ID threaded through all steps for end-to-end tracing"],
      ["Re-run", "Replay a failed workflow run from last successful action"],
      ["Throttled Runs", "Runs queued because concurrency limit hit"]
    ],
    qa: [
      { q: "How do you implement a canonical transformation pattern in Logic Apps?", a: "The canonical model pattern: all incoming messages from various source systems are transformed to a common canonical format, processed centrally, then transformed to each target system's format on egress. In Logic Apps: inbound trigger receives source message → Parse JSON (validate source schema) → call an XSLT Map (stored in Integration Account or Standard project) to transform to canonical → process canonical model → call another map to transform to target schema → send to target. The benefit: when you add a new source system, you only write one map (source → canonical). When you add a new target, only one map (canonical → target). On the Insurance project: all 5 source systems (policy, claims, billing, reinsurance, portal) had distinct schemas. We defined a canonical ClaimEvent schema. Each source had one inbound XSLT map, each target had one outbound map — 10 maps total instead of 5×5=25 point-to-point maps. This was a direct translation of the BizTalk canonical pattern we had before." },
      { q: "What are the Logic Apps concurrency and parallelism settings?", a: "Trigger concurrency: controls how many concurrent workflow instances can run simultaneously. Default is disabled (unlimited on Standard, 25 on Consumption). Enable concurrency control to limit: if set to 10, only 10 runs execute in parallel, others are queued. Useful for protecting downstream services. For Each action: by default iterates sequentially in Consumption. In Standard, For Each has a degree of parallelism setting (default 20) — all items processed in parallel up to that limit. Split On: when trigger receives an array, split it into individual runs (one run per array item). Action timeout: each action has a default timeout — for long-running operations, increase it in action settings. For the Insurance project, I set trigger concurrency to 50 on the claims processing workflow — the downstream SQL database could handle 50 concurrent writes comfortably, and this prevented query timeouts." }
    ],
    diagram: `BIZTALK → LOGIC APPS MIGRATION MAP

BizTalk Concept          → Logic Apps Equivalent
─────────────────────────────────────────────────
Receive Port/Location    → Trigger (SB, HTTP, Blob)
Send Port (static)       → HTTP action / SB Send
Send Port (dynamic)      → HTTP action with variable URL
Orchestration            → Workflow
Message Type/Schema      → JSON Schema + Parse JSON
Map (XSLT)              → XSLT Map (Integration Account) / Liquid
Pipeline (decode/encode) → Function App (custom transform)
Correlation Set          → Service Bus Session or variable
Suspend Queue            → Dead-Letter Queue
Event Log                → Application Insights
BizTalk Admin Console    → Azure Monitor + Logic App Run History`
  },

  topic12: {
    id: "topic12", num: "12", title: "Azure Functions", day: "FRI",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Serverless compute — triggers, bindings, hosting plans, Durable Functions, scaling.",
    concepts: [
      { title: "Triggers & Bindings", body: "Triggers start a function: HTTP, Timer, Service Bus, Event Hub, Blob, Queue, Event Grid, Cosmos DB change feed. Bindings are declarative connections to data sources without boilerplate: input bindings (read data on invocation), output bindings (write data on completion). Example: Service Bus trigger (receive message) + SQL input binding (look up customer) + Blob output binding (write result) — all configured in function.json or via attributes, no connection management code. I used Service Bus trigger → SQL input binding → Blob output binding in the Insurance claims transformation Function — eliminated 80% of boilerplate code." },
      { title: "Hosting Plans", body: "Consumption: scale to zero, per-execution billing, cold start risk, 5min timeout (configurable to 10min), max 200 instances. Premium: pre-warmed instances (no cold start), VNet integration, 60min timeout, unlimited scale. Dedicated (App Service Plan): always-on, predictable cost, share with Logic Apps Standard, VNet integration. Flex Consumption (new): per-execution billing like Consumption but with VNet integration and no cold start via always-ready instances. For integration scenarios: Premium or Flex Consumption for production workloads requiring VNet integration and no cold start. Consumption only for dev/test or very low-frequency triggers." },
      { title: "Durable Functions", body: "Durable Functions add orchestration to serverless: Orchestrator function (coordinates activities, deterministic, may replay), Activity function (actual work — calls APIs, writes DB), Entity function (stateful object), Client function (starts orchestrations). Patterns: Fan-out/Fan-in (parallel processing, wait for all), Monitor (polling loop with adaptive sleep), Human Interaction (wait for external event with timeout), Chaining (sequence of activities). State persisted to Azure Storage automatically. Use Durable for: long-running workflows (hours/days), fan-out parallelism, waiting for external events, saga implementation. On the Insurance project: used Durable Functions for a multi-step claim settlement workflow — fan-out to 3 parallel validation services, fan-in on results, then sequential settlement steps." },
      { title: "Cold Start & VNet Integration", body: "Cold start: on Consumption plan, if no requests for a while, the instance is deallocated. Next request triggers cold start — the runtime loads, your dependencies initialise. .NET typically 200-500ms, Java/Python longer. Mitigations: Premium plan (always-warm instance), Flex Consumption (always-ready instances), reduce dependencies, use .NET isolated worker model. VNet Integration: Functions running in a VNet can reach private endpoints (Service Bus, SQL, Storage) without public internet. Required for enterprise deployments. Consumption plan does NOT support VNet integration — use Premium or Flex Consumption. Outbound VNet integration (function reaches into VNet); separate from private endpoint (inbound, function is itself not publicly reachable)." }
    ],
    terms: [
      ["Trigger", "Event that starts function execution"],
      ["Binding", "Declarative input/output connection to data source"],
      ["Consumption Plan", "Scale-to-zero, per-execution billing, cold start risk"],
      ["Premium Plan", "Pre-warmed, VNet integration, higher cost"],
      ["Durable Functions", "Stateful orchestration extension for Functions"],
      ["Orchestrator", "Durable coordinator — deterministic, may replay"],
      ["Activity", "Durable unit of work — called by orchestrator"],
      ["Fan-out/Fan-in", "Parallel execution of activities, aggregate results"],
      ["Cold Start", "Latency on first request after idle period"],
      ["KEDA", "Kubernetes-based event-driven autoscaling (used in Flex Consumption)"],
      ["Isolated Worker", ".NET Functions running in separate process — better cold start"]
    ],
    qa: [
      { q: "How does Azure Functions scaling work with Service Bus triggers?", a: "The Functions scale controller monitors the Service Bus queue or topic subscription and scales out based on the number of active messages. The algorithm: it samples message count every few seconds and scales proportionally. For queues, it scales up to one instance per 16 messages up to the max scale-out limit (200 for Consumption, configurable for Premium). On Premium plan you can set a minimum instance count to avoid cold starts — I typically set minimum 2 instances for production Service Bus-triggered Functions so there's always capacity. The scale-out is fast (seconds) but scale-in is gradual (avoid thrashing). For high-throughput scenarios: increase the maxConcurrentCalls in host.json (default 16) — each instance processes up to N messages concurrently. If you have 200 instances × 16 concurrent = 3200 concurrent message processors. Key: if processing is slow and DLQ is growing, first check if maxConcurrentCalls is limiting before adding more instances." },
      { q: "Explain the Durable Functions fan-out/fan-in pattern with a real example.", a: "Fan-out/fan-in: start multiple activities in parallel, wait for all to complete, aggregate results. Classic use case: validate a document against multiple rules simultaneously. In code (C# isolated worker): the orchestrator uses Task.WhenAll to await all activity tasks simultaneously. Example from Insurance project: claim submission orchestrator fan-out to three parallel validators — FraudCheck activity, PolicyValidator activity, MedicalReviewValidator activity. Each is an independent Function that may call an external API or ML model. All three run in parallel. The orchestrator awaits Task.WhenAll of all three results. If any fails, the orchestrator can compensate (cancel the others, dead-letter the claim). The fan-in aggregates: all three pass → ClaimApproved, any fails → ClaimFlagged with reasons. This replaced a sequential BizTalk orchestration that ran all three checks in series (3x the latency) with parallel execution that was 3x faster." }
    ],
    diagram: `AZURE FUNCTIONS INTEGRATION PATTERN

[Service Bus Queue: claims-inbound]
        ↓ (trigger)
[Function: ClaimProcessor] (Premium Plan, VNet integrated)
  ├── Input binding: SQL (look up policy)
  ├── Process: validate + transform claim
  ├── Output binding: Service Bus (route to next queue)
  └── Output binding: Blob (archive payload)

DURABLE FUNCTIONS PATTERN
[HTTP Trigger: Client Function]
   → Start Orchestration
       → Activity: FraudCheck (parallel)
       → Activity: PolicyValidation (parallel)
       → Activity: MedicalReview (parallel)
       ← Wait for all (fan-in)
   → Aggregate results → Activity: UpdateClaimStatus
   → Return orchestration status URL to caller`
  },

  topic13: {
    id: "topic13", num: "13", title: "Azure API Management", day: "FRI",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Gateway, policies, security, throttling, APIM+Service Bus pattern — the API fabric.",
    concepts: [
      { title: "APIM Architecture", body: "APIM has three planes: Gateway (processes API requests, applies policies, routes to backend), Management Plane (configuration via portal/ARM/Bicep), Developer Portal (documentation, try-it, subscription management). APIs in APIM group Operations (HTTP endpoints). Products group APIs with a subscription requirement. Subscriptions hold API keys. Tiers: Developer (dev/test, no SLA), Basic (small workloads), Standard (mid-scale), Premium (multi-region, VNet, zone redundancy). For enterprise: Premium tier with VNet integration is standard." },
      { title: "Internal vs External Mode", body: "External mode (default): APIM gateway has a public IP, reachable from internet. External clients can call APIs. Internal mode: APIM deployed inside a VNet with only a private IP — not reachable from internet. Typically paired with Application Gateway (WAF) in front: internet → Application Gateway (WAF, DDoS, SSL termination) → APIM Internal (policies, auth, throttling) → backend (Function Apps, Logic Apps, Service Bus). This is the gold-standard architecture for enterprise: WAF handles DDoS and OWASP threats, APIM handles API management, backends are fully private. I implemented this architecture for the Insurance client — zero public endpoints for backend services." },
      { title: "Policy Engine", body: "Policies are XML snippets applied to API requests/responses. Policy scopes: Global (all APIs), Product, API, Operation. Execution order: Inbound (before backend call) → Backend (backend routing) → Outbound (after backend responds) → On-Error (error handling). Key policies: validate-jwt (token validation), rate-limit-by-key (throttling per client), set-header (add/remove headers), rewrite-uri (transform URL), send-request (call external service or Service Bus), cache-lookup/cache-store (response caching), log-to-eventhub (send request/response to Event Hub for audit), authentication-managed-identity (get MI token for backend), cors (CORS handling)." },
      { title: "Named Values & Key Vault Integration", body: "Named Values store configuration: plain text, secret (encrypted), or Key Vault reference. Reference in policies as {{my-named-value}}. For secrets (API keys, backend credentials): use Key Vault reference — APIM fetches from Key Vault using its managed identity. Never store secrets as plain-text Named Values in production. This pattern ensures secrets are centralised in Key Vault, rotatable without redeploying APIM policies, and auditable. APIM MI needs 'Key Vault Secrets User' role on the Key Vault." }
    ],
    terms: [
      ["Gateway", "Request processor — applies policies, routes to backend"],
      ["Policy", "XML configuration for request/response transformation"],
      ["Product", "API grouping with subscription requirement and rate limits"],
      ["Named Value", "Key-value store for config values referenced in policies"],
      ["Backend", "Configured upstream service (URL + credentials + circuit breaker)"],
      ["Subscription Key", "API authentication key (Ocp-Apim-Subscription-Key header)"],
      ["validate-jwt", "Policy: validate JWT Bearer token, check claims"],
      ["rate-limit-by-key", "Policy: throttle requests per client/IP/subscription"],
      ["WAF", "Web Application Firewall — OWASP rule protection before APIM"],
      ["APIOps", "GitOps for APIM — extract/apply config via CI/CD pipelines"],
      ["Revision", "Non-breaking API version — gradual rollout"],
      ["Version", "Breaking API change — v1, v2 with version set"]
    ],
    qa: [
      { q: "Walk me through the Application Gateway + APIM Internal architecture.", a: "This is the gold standard pattern for enterprise APIs. Architecture layers: Public internet → Azure DDoS Protection → Application Gateway (WAF) → APIM (Internal VNet mode) → Private backends. Application Gateway sits in a public subnet, has a public IP. It terminates SSL, applies WAF rules (OWASP 3.2 ruleset), and forwards traffic to APIM's private VIP. APIM is deployed in Internal mode inside a subnet — it has no public IP. APIM applies policies (JWT validation, throttling, logging). APIM routes to backends via private endpoints — Function Apps, Logic Apps, Service Bus, SQL — none of which have public endpoints. The result: the only public-facing component is Application Gateway. All business logic is fully private. For the Insurance client this was non-negotiable for PCI/GDPR compliance — we had zero public endpoints beyond the gateway. Deployment: APIM and AppGW require specific subnet delegation and NSG rules; the AppGW subnet needs APIM management ports open (GatewayManager service tag). I deployed this via Bicep with all NSG rules codified." },
      { q: "How would you implement rate limiting in APIM?", a: "Two policy options: rate-limit (by subscription, fixed window) and rate-limit-by-key (by any extractable key — IP, JWT claim, header). For per-client throttling I use rate-limit-by-key with the subscription key or a custom claim from the JWT: <rate-limit-by-key calls='100' renewal-period='60' counter-key='@(context.Subscription.Id)' />. This limits each subscription to 100 calls per 60 seconds. When limit is hit, APIM returns 429 Too Many Requests with Retry-After header. For product-level limits: rate-limit policy on the Product scope — all APIs in the product share the quota. For spike protection: combine rate-limit-by-key (per client) with a global rate-limit at the global scope. Also useful: quota-by-key for monthly/daily aggregate limits rather than per-second. I monitor throttling via APIM metrics — the Requests metric filtered by Response Code = 429 gives the throttling rate; alert if > 5% of requests are throttled." },
      { q: "How do you secure backend APIs that APIM calls?", a: "Multiple layers: First, backend APIs should have no public endpoints — deployed behind private endpoints in the APIM VNet. Second, APIM authenticates to backends using Managed Identity — the authentication-managed-identity policy fetches an access token for the backend's Entra ID app registration scope. Third, for backends that use subscription keys (third-party APIs), store keys as Key Vault–backed Named Values in APIM and reference them in set-header policy. Fourth, for mutual TLS with backends: upload client certificates to APIM and use certificate authentication in the backend policy. Fifth, the APIM backend entity can have circuit breaker configuration — if the backend returns 5xx repeatedly, APIM circuit-breaks and returns a cached fallback or 503. This pattern means: even if a backend crashes, APIM handles graceful degradation. I implemented all five layers on the Insurance project — the reinsurance partner backend used mTLS, internal services used MI, third-party enrichment APIs used KV-backed named values." }
    ],
    apimPolicy: `<!-- APIM Policy: JWT Validation + Rate Limit + Service Bus Publish -->
<policies>
  <inbound>
    <!-- 1. Validate JWT from Entra ID -->
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401"
                  failed-validation-error-message="Unauthorized">
      <openid-config url="https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration"/>
      <audiences><audience>api://{api-app-id}</audience></audiences>
      <required-claims>
        <claim name="roles" match="any"><value>Claims.Write</value></claim>
      </required-claims>
    </validate-jwt>

    <!-- 2. Rate limit per subscription: 100 calls/min -->
    <rate-limit-by-key calls="100" renewal-period="60"
      counter-key="@(context.Subscription.Id)"
      remaining-calls-header-name="X-RateLimit-Remaining"
      retry-after-header-name="Retry-After"/>

    <!-- 3. Set correlation ID -->
    <set-header name="x-correlation-id" exists-action="override">
      <value>@(context.RequestId)</value>
    </set-header>

    <!-- 4. Publish to Service Bus via Managed Identity -->
    <set-variable name="requestBody"
      value="@(context.Request.Body.As<string>(preserveContent:true))"/>
    <send-request mode="new" response-variable-name="sbResult" timeout="15">
      <set-url>https://{namespace}.servicebus.windows.net/{queue}/messages</set-url>
      <set-method>POST</set-method>
      <set-header name="Content-Type" exists-action="override">
        <value>application/json</value>
      </set-header>
      <set-header name="BrokerProperties" exists-action="override">
        <value>@("{\"MessageId\":\"" + context.RequestId + "\"}")</value>
      </set-header>
      <authentication-managed-identity resource="https://servicebus.azure.net"/>
      <set-body>@((string)context.Variables["requestBody"])</set-body>
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

  topic14: {
    id: "topic14", num: "14", title: "Integration Architecture Patterns", day: "SAT",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Sync vs async, pub-sub, choreography vs orchestration, enterprise integration patterns.",
    concepts: [
      { title: "Synchronous vs Asynchronous", body: "Synchronous: caller waits for response — tight coupling, simple, higher latency impact. Good for: user-facing real-time lookups, validations, data retrieval. Asynchronous: caller fires message, continues — loose coupling, resilient, eventual consistency. Good for: long-running processes, cross-system integration, batch operations. In Azure: APIM → HTTP → Function App (sync); APIM → Service Bus (async, 202 response). Always prefer async for integration between bounded contexts — a failure in billing shouldn't fail the claims submission." },
      { title: "Choreography vs Orchestration", body: "Orchestration: central coordinator (Logic App, Durable Functions orchestrator) controls all steps. It knows the full process, calls each service, handles failures. Easier to trace (one place), but central point of failure and coupling. Choreography: no central coordinator — each service reacts to events and produces its own events. Loose coupling, independently deployable, but harder to trace (distributed saga). In practice: orchestration for complex business processes with compensation logic (claim settlement, order processing); choreography for event-driven notifications and fan-out scenarios where services need to evolve independently." },
      { title: "Saga Pattern", body: "Saga manages distributed transactions across microservices without 2-phase commit. Two styles: Orchestrated saga (central orchestrator issues commands, handles compensation on failure) or Choreographed saga (each service publishes events, next service reacts). Example: Order saga — OrderCreated event → InventoryReserved → PaymentCharged → OrderConfirmed. If PaymentCharged fails: compensating transaction → InventoryReleased → OrderCancelled. In Azure: Durable Functions orchestrator for orchestrated sagas (perfect fit — built-in state, compensation logic, event waiting). Service Bus topic choreography for event-driven sagas." },
      { title: "Enterprise Integration Patterns (EIP)", body: "Key patterns from Hohpe & Woolf: Message Router (route messages based on content/type — Service Bus filters, Logic App switch), Message Translator (transform format — XSLT map, Liquid, Function App), Content Enricher (add missing data — call lookup service before routing), Splitter (split batch message into individual messages — Logic App For Each), Aggregator (collect correlated messages, aggregate — Durable Functions with external events), Correlation Identifier (MessageId or CorrelationId in Service Bus), Dead Letter Channel (DLQ pattern), Message Expiration (Service Bus TTL). I referenced EIP patterns explicitly when designing the Insurance integration architecture — the architecture diagram annotated each component with its EIP pattern name." }
    ],
    terms: [
      ["Saga", "Distributed transaction using compensating transactions"],
      ["Choreography", "Event-driven, no central coordinator"],
      ["Orchestration", "Central coordinator controls process flow"],
      ["Content-Based Router", "Routes messages based on message content"],
      ["Splitter", "Breaks one message into multiple individual messages"],
      ["Aggregator", "Collects and combines correlated messages"],
      ["Enricher", "Adds missing data to message by calling external service"],
      ["Canonical Model", "Common data format as intermediary between schemas"],
      ["Circuit Breaker", "Stops calls to failing service, allows recovery"],
      ["Bulkhead", "Isolate failures — separate resource pools per consumer"]
    ],
    qa: [
      { q: "Design an event-driven order processing architecture on Azure.", a: "Order submitted via APIM (HTTP POST) → APIM validates JWT and publishes to Service Bus Topic 'orders'. Three subscriptions: InventoryService subscription (Function App, reduces stock), PaymentService subscription (Logic App, charges card), NotificationService subscription (Logic App, sends confirmation email). Each service operates independently — if Payment is slow, Inventory and Notification are unaffected. For the saga compensation: use Service Bus correlation — each message carries OrderId as CorrelationId. If Payment fails, it publishes to 'order-failed' topic. Inventory service subscribes to 'order-failed' and reverses the stock reservation. This is a choreographed saga with Event Grid for cross-domain notifications (order status updated → Event Grid → CRM, Reporting subscriptions). APIM returns 202 immediately, client polls status endpoint backed by Azure Cache for Redis or CosmosDB." },
      { q: "How do you choose between choreography and orchestration?", a: "I use orchestration when: the process has complex compensation logic (if step 3 fails, undo steps 1 and 2 in order), the business needs a single traceable audit of the entire workflow, or the process involves human approval steps (wait for external event). Logic Apps stateful workflows and Durable Functions orchestrators are my tools. I use choreography when: services need to evolve and deploy independently, the integration is adding a new consumer of existing events without modifying producers, or the fan-out is simple (one event, many independent reactions). Service Bus topics + Event Grid are my tools. The warning signs for orchestration going wrong: orchestrator becomes a god object knowing every service's internals, services can't be tested without the orchestrator. Warning signs for choreography going wrong: impossible to understand the full business process flow, debugging requires correlating logs across 8 services. I often use a hybrid: orchestrate within a bounded context, choreograph between bounded contexts." }
    ],
    diagram: `ORCHESTRATION                    CHOREOGRAPHY
─────────────                    ────────────

Orchestrator (Logic App)         Claims Service
  → Call: FraudCheck               → publish: ClaimSubmitted
  → Call: PolicyValidate              ↓
  → Call: MedicalReview          Fraud Service (reacts)
  → Compensate if any fail         → publish: FraudCheckPassed
                                          ↓
                                   Policy Service (reacts)
                                     → publish: PolicyValidated
                                          ↓
                                   Settlement Service (reacts)`
  },

  topic15: {
    id: "topic15", num: "15", title: "Azure Networking", day: "SAT",
    badge: "pending", badgeLabel: "PENDING",
    desc: "VNet, NSG, Private Endpoints, Hub-and-Spoke — securing integration infrastructure.",
    concepts: [
      { title: "VNet & Subnets", body: "VNet is an isolated network in Azure — your own private address space (CIDR). Subnets segment the VNet for different resource types: separate subnets for APIM, Function Apps, Service Bus private endpoints, Application Gateway. Each subnet can have an NSG (Network Security Group) for traffic rules. VNet Integration allows Function Apps and Logic Apps to make outbound calls into the VNet (to reach private endpoints). Resources in the same VNet communicate privately; inter-VNet uses VNet Peering. Hub-and-Spoke: Hub VNet contains shared services (APIM, Firewall, VPN Gateway); Spoke VNets contain application workloads, peered to Hub." },
      { title: "Private Endpoints", body: "Private Endpoint = a NIC with a private IP in your VNet connected to an Azure PaaS resource (Service Bus, Storage, Key Vault, SQL, etc.). Traffic to that service goes through your VNet, never the public internet. Service Bus with private endpoint: clients in the VNet connect to the private IP (e.g., 10.0.1.5) which resolves to privatelink.servicebus.windows.net. Requires private DNS zone integration: Azure Private DNS Zone for privatelink.servicebus.windows.net resolves the namespace to the private IP inside the VNet. After adding private endpoint, disable public access on Service Bus for zero-trust. Private endpoints are essential for compliance in financial and healthcare." },
      { title: "NSG Rules", body: "NSG = stateful firewall for subnets and NICs. Rules: Priority (lower = higher priority), Source (IP, CIDR, Service Tag, ASG), Destination, Protocol, Port, Action (Allow/Deny). Service Tags: AzureServiceBus, AzureMonitor, AppService, GatewayManager — use instead of individual IPs which change. Default deny all inbound from internet. For APIM in internal mode: NSG must allow GatewayManager (65200-65535) for APIM management plane. Application Gateway subnet: allow inbound from GatewayManager, allow outbound to APIM subnet. Always document NSG rules in IaC (Bicep) — never apply ad-hoc portal changes." }
    ],
    terms: [
      ["VNet", "Virtual Network — isolated Azure network with private address space"],
      ["Subnet", "Segment of VNet CIDR — separate for different resource types"],
      ["NSG", "Network Security Group — stateful firewall rules for subnet/NIC"],
      ["Private Endpoint", "NIC with private IP connected to PaaS resource in your VNet"],
      ["Service Endpoint", "Route traffic to PaaS via Azure backbone but no private IP"],
      ["VNet Integration", "Allows App Service/Functions to make outbound calls into VNet"],
      ["Private DNS Zone", "Resolves PaaS private endpoint FQDNs to private IPs"],
      ["Hub-and-Spoke", "Network topology: shared Hub VNet + peered application Spoke VNets"],
      ["UDR", "User-Defined Route — override default routing (e.g., force via Firewall)"],
      ["Service Tag", "Named group of Azure service IPs for NSG rules"]
    ],
    qa: [
      { q: "How would you secure a Function App so it only receives traffic from APIM?", a: "Multiple layers: First, access restrictions — in the Function App networking settings, add IP restriction to only allow the APIM outbound IPs (or the APIM subnet if VNet integrated). Second, if APIM and Function App are in the same VNet: remove public access from the Function App entirely (deploy into a subnet with private endpoint), set APIM backend URL to the private endpoint. Third, function-level auth key: APIM passes the function key as header x-functions-key — the Function App rejects requests without it. Fourth: Managed Identity — APIM calls the Function using MI token; Function validates the token from Entra ID. Defense in depth: network restriction + auth key + MI token. I implemented all three on the Insurance project. The Function Apps had zero public access — only APIM (via VNet) could reach them, and they still validated MI tokens as a second factor." },
      { q: "Explain the Hub-and-Spoke network topology for integration.", a: "Hub VNet contains shared networking infrastructure: Azure Firewall (inspect and filter all outbound traffic), APIM (Internal mode, serving all APIs), VPN or ExpressRoute Gateway (on-prem connectivity), Bastion (jump host for management). Spoke VNets contain application workloads: Spoke-Integration (Function Apps, Logic Apps, Service Bus private endpoints), Spoke-Data (SQL private endpoints, Storage private endpoints). Spokes peer to Hub — traffic from Spoke to Spoke goes through Hub Firewall (forced via UDR). Benefits: centralised security (one firewall policy), shared APIM gateway, cost efficiency (one VPN gateway, one Firewall). For the Insurance project: Hub VNet with APIM Internal + App Gateway, two Spoke VNets (integration workloads, data tier). All cross-spoke traffic inspected by Azure Firewall. On-prem connected via ExpressRoute for SAP integration." }
    ],
    diagram: `HUB-AND-SPOKE TOPOLOGY

Internet → [App Gateway + WAF] (Public Subnet)
                    ↓
              [HUB VNet]
              ├── APIM Internal (apim-subnet)
              ├── Azure Firewall (firewall-subnet)
              └── VPN/ExpressRoute Gateway

Spoke VNets (peered to Hub via Firewall UDR)
├── Spoke-Integration
│   ├── Function Apps (VNet integrated)
│   ├── Logic Apps Standard (VNet integrated)
│   └── Private Endpoints: Service Bus, Key Vault
└── Spoke-Data
    ├── Private Endpoint: SQL Server
    └── Private Endpoint: Storage Account

On-Premises → ExpressRoute → Hub → (via peering) → Spoke resources`
  },

  topic16: {
    id: "topic16", num: "16", title: "Security & Governance", day: "SAT",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Zero Trust, RBAC, Azure Policy, Key Vault deep dive, Defender for Cloud.",
    concepts: [
      { title: "Zero Trust Principles", body: "Zero Trust: never trust, always verify. Verify explicitly (authenticate and authorise every request, regardless of network location), use least-privilege access (minimum permissions required), assume breach (design for failure, monitor everything). Applied to Azure integration: every service-to-service call uses Managed Identity + RBAC (not shared keys), all resources in private VNets (no trust based on network location), all actions logged to Log Analytics, Azure Defender monitors for anomalies. On the Insurance project I ran a Zero Trust assessment using the Microsoft Zero Trust Deployment Center framework and documented the maturity score before and after the migration." },
      { title: "Azure Policy", body: "Azure Policy evaluates resources against rules and enforces compliance. Effects: Audit (log non-compliant, no block), Deny (block resource creation if non-compliant), DeployIfNotExists (automatically remediate — add missing diagnostic settings), Modify (add missing tags). Initiatives: group multiple policies. Examples relevant to integration: require private endpoints on Service Bus namespaces, require TLS 1.2 minimum, require diagnostic settings on Logic Apps, deny creation of storage accounts with public access enabled, enforce required tags. Assign policies at Management Group scope to apply across all subscriptions. Remediation tasks fix existing non-compliant resources." },
      { title: "Key Vault Best Practices", body: "One Key Vault per application per environment (not a shared vault for all apps — blast radius control). Enable soft delete (90-day recovery) and purge protection (cannot permanently delete during retention). Use RBAC for access control (not legacy Access Policies). Separate secrets, keys, and certificates into naming conventions. Enable diagnostic logging to Log Analytics — audit all access. Rotate secrets regularly — use Key Vault + Event Grid (SecretNearExpiry event) → Logic App to trigger rotation workflow. Never read secrets directly in APIM policies — use Named Values backed by Key Vault. Reference secrets via Key Vault references in App Settings for Function Apps and Logic Apps (Azure resolves at runtime)." }
    ],
    terms: [
      ["Zero Trust", "Never trust, always verify — no implicit network trust"],
      ["RBAC", "Role-Based Access Control — principal + role + scope"],
      ["Azure Policy", "Rule engine for resource compliance — audit, deny, remediate"],
      ["Initiative", "Collection of related Azure policies assigned together"],
      ["Soft Delete", "Key Vault: deleted resources recoverable for 90 days"],
      ["Purge Protection", "Key Vault: prevents permanent deletion during retention period"],
      ["Microsoft Defender for Cloud", "Cloud security posture management + workload protection"],
      ["Secure Score", "Defender for Cloud metric — higher = more secure configuration"],
      ["JIT Access", "Just-in-time VM access — port opened only when requested"],
      ["PIM", "Privileged Identity Management — time-bound elevated role access"]
    ],
    qa: [
      { q: "How do you implement least-privilege access for an integration solution?", a: "I map out every service-to-service interaction and assign the minimum required role at the minimum required scope. Example inventory for the Insurance project: Function App → Service Bus (Azure Service Bus Data Receiver on specific queue, not namespace-wide), Logic App → Key Vault (Key Vault Secrets User on specific secret, not entire vault), APIM MI → Service Bus (Azure Service Bus Data Sender on namespace for publish-only operations), Function App → Storage (Storage Blob Data Contributor on specific container, not account-wide). I document this in a permissions matrix in the project wiki and enforce it via Bicep — all role assignments are in code, reviewed in PRs, auditable via git history. For human operators: use Azure PIM for time-bound, request-approved elevated access. No permanent Owner/Contributor on production — engineers request 4-hour access, approved by team lead, all actions logged. This design was validated in an EY internal security review." }
    ],
    diagram: `ZERO TRUST INTEGRATION SECURITY

Network Layer: All resources in private VNets, no public endpoints
Identity Layer: All service-to-service via Managed Identity + RBAC
Data Layer: Encryption at rest (Storage, Service Bus) + in transit (TLS 1.2+)
Application Layer: APIM validate-jwt + rate limiting
Monitoring Layer: All diagnostic logs → Log Analytics → Sentinel alerts

ROLE ASSIGNMENT MATRIX
Resource              → Target           Role
─────────────────────────────────────────────────────
Function App MI       → Service Bus Q    SB Data Receiver
Logic App MI          → Service Bus T    SB Data Sender
APIM MI               → Service Bus NS   SB Data Sender
Function App MI       → Key Vault        KV Secrets User
Logic App MI          → Storage Acct     Storage Blob Contributor
APIM MI               → Key Vault        KV Secrets User`
  },

  topic17: {
    id: "topic17", num: "17", title: "Monitoring & Observability", day: "SAT",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Azure Monitor, App Insights, Log Analytics, KQL — end-to-end integration observability.",
    concepts: [
      { title: "Azure Monitor Ecosystem", body: "Azure Monitor collects: Metrics (numeric, time-series, 93-day retention, near-realtime — Service Bus queue depth, Logic App run count), Logs (structured/unstructured text, stored in Log Analytics workspace, queried with KQL — Function App exceptions, Logic App run details, APIM request logs), Activity Log (control-plane events — who deployed what, role assignment changes). Diagnostic Settings: configure on each resource to send metrics and logs to Log Analytics workspace, Event Hub (streaming), or Storage Account (archival). Always enable diagnostic settings on: Service Bus (OperationalLogs, RuntimeAuditLogs), APIM (GatewayLogs, WebSocketConnectionLogs), Logic Apps (WorkflowRuntime), Function Apps (FunctionAppLogs)." },
      { title: "Application Insights", body: "App Insights is distributed tracing + APM inside Azure Monitor. Key data: Requests (HTTP calls into the app), Dependencies (calls from the app to downstream — Service Bus, SQL, HTTP), Exceptions, Custom Events, Custom Metrics, Traces. Correlation: Operation ID threads through all telemetry for a single request across components — APIM propagates to Function App propagates to Service Bus call. Logic Apps integration: add App Insights resource to Logic App, tracked properties emit custom dimensions per action. Key feature: Live Metrics — real-time stream of requests, failures, and performance. For integration: query failed dependencies to find which downstream is causing cascading failures." },
      { title: "KQL for Integration Monitoring", body: "KQL (Kusto Query Language) is the query language for Log Analytics. Key tables: requests (App Insights), dependencies (App Insights), exceptions (App Insights), AzureDiagnostics (Service Bus, APIM, Logic Apps), FunctionAppLogs. Common queries: failed Logic App runs in last hour, DLQ messages by queue name, APIM 429 rate by subscription, average Function App duration by trigger type. KQL basics: | where (filter), | project (select columns), | summarize count() by bin(timestamp, 5m) (aggregate), | order by timestamp desc, | join (join two tables), | render timechart (visualise)." }
    ],
    terms: [
      ["Metrics", "Numeric time-series data — queue depth, request rate, latency"],
      ["Logs", "Structured text stored in Log Analytics, queried with KQL"],
      ["Log Analytics Workspace", "Central store for all diagnostic logs"],
      ["KQL", "Kusto Query Language — query language for Log Analytics"],
      ["Application Insights", "Distributed tracing + APM component of Azure Monitor"],
      ["Operation ID", "Correlation ID threading across all telemetry for one request"],
      ["Dependency", "App Insights: outbound call from app to downstream service"],
      ["Sampling", "App Insights: collect % of telemetry to reduce cost (adaptive sampling)"],
      ["Action Group", "Alert notification config: email, SMS, webhook, ITSM"],
      ["Workbook", "Azure Monitor interactive dashboard with KQL visualisations"]
    ],
    qa: [
      { q: "How do you implement end-to-end distributed tracing across APIM → Service Bus → Logic App → Function App?", a: "The key is propagating the correlation ID (Operation ID) through every hop. APIM: configure Application Insights integration on the APIM instance — it auto-instruments all gateway requests and emits to App Insights. Set a custom header x-correlation-id = context.RequestId in the inbound policy and add it as a BrokerProperty on the Service Bus message. Service Bus: when Logic App or Function App receives the message, extract the x-correlation-id from message custom properties and set it as the App Insights Operation ID using TelemetryContext or ILogger scope. Logic Apps Standard: in diagnostic settings, enable App Insights. Use Tracked Properties on key actions to emit ClaimId, PolicyNumber, MessageId as custom dimensions. Function Apps: configure APPLICATIONINSIGHTS_CONNECTION_STRING — Functions SDK auto-correlates if you propagate the W3C traceparent header or Activity.Current. In App Insights: query the 'end-to-end transaction' view using the Operation ID — you see the full chain: APIM gateway request → Service Bus dependency → Logic App run → Function App execution as a unified trace. I built a KQL dashboard for the Insurance project showing P99 end-to-end latency per claim type, broken down by each hop." },
      { q: "Write a KQL query to find failed Logic App runs in the last hour.", a: `// Failed Logic App runs in last 1 hour with error details
AzureDiagnostics
| where ResourceType == "WORKFLOWS"
| where TimeGenerated > ago(1h)
| where status_s == "Failed"
| project
    TimeGenerated,
    WorkflowName = resource_workflowName_s,
    RunId = resource_runId_s,
    ErrorCode = error_code_s,
    ErrorMessage = error_message_s,
    TriggerType = resource_triggerName_s,
    Duration = toreal(endTime_t - startTime_t) / 10000000
| order by TimeGenerated desc
| take 100` }
    ],
    diagram: `OBSERVABILITY ARCHITECTURE

[APIM] ──diag──→ [Log Analytics Workspace]
[Service Bus] ───diag──→ [Log Analytics Workspace]  ← KQL Queries
[Logic Apps] ────diag──→ [Log Analytics Workspace]
[Function Apps] ─diag──→ [Log Analytics Workspace]

[App Insights] ←─ auto-instrument ─ [APIM + Functions + Logic Apps]
    └── Distributed Trace (Operation ID correlation)

[Azure Monitor Alerts]
├── Metric Alert: Service Bus DLQ depth > 0 → Action Group (email + webhook)
├── Metric Alert: Logic App Failed Runs > 5 in 5min → PagerDuty
├── Log Alert: KQL query Exception count > 10 → Teams
└── Metric Alert: APIM 429 rate > 5% → Scale-out notification`
  },

  topic18: {
    id: "topic18", num: "18", title: "DevOps & Deployment", day: "SUN",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Bicep/ARM, GitHub Actions, APIM DevOps, IaC for integration services.",
    concepts: [
      { title: "Infrastructure as Code — Bicep", body: "Bicep is the preferred IaC language for Azure — compiles to ARM JSON, readable syntax, type-safe. For integration deployments: one Bicep module per resource type (servicebus.bicep, functionapp.bicep, apim.bicep), a main.bicep that orchestrates all modules with parameter passing. Parameter files per environment: main.dev.bicepparam, main.prod.bicepparam. Deploy via: az deployment group create or GitHub Actions azure/arm-deploy action. Bicep advantages over ARM JSON: 80% less verbose, type validation, module system, what-if deployment preview. Always use what-if before production deployments: az deployment group what-if to preview changes." },
      { title: "CI/CD for Integration", body: "Logic Apps Standard: deploy as a zip package (workflow definitions are JSON files in the project). GitHub Actions: checkout → az login (OIDC federated credential, no secrets) → zip the project → az functionapp deployment source config-zip. Function Apps: zip deploy or GitHub Actions AzureFunctions/action. APIM: APIOps (Azure APIM DevOps toolkit) — extract APIM config to Git (APIs, policies, products, named values), apply changes via pipeline. Environment promotion: Dev → Test → Staging → Production with manual approval gates. Never deploy directly to Production — always use a staging slot and swap." },
      { title: "OIDC for Secure Azure Deployments", body: "Best practice: GitHub Actions authenticates to Azure using OpenID Connect (Workload Identity Federation) — no stored Azure credentials in GitHub Secrets. Configure: create a federated credential on an Azure App Registration, allow GitHub to issue tokens for a specific repo/branch. In workflow: azure/login action with client-id, tenant-id, subscription-id (no client-secret). Azure validates the OIDC token from GitHub. This is the zero-secret CI/CD pattern — no rotation required, no exposure risk." }
    ],
    terms: [
      ["Bicep", "Azure IaC DSL that compiles to ARM JSON — preferred over raw ARM"],
      ["ARM Template", "JSON-based Azure Resource Manager deployment template"],
      ["What-if", "Preview Bicep/ARM deployment changes without applying"],
      ["GitHub Actions", "CI/CD platform with YAML workflow definitions"],
      ["OIDC/Federated Credential", "Passwordless authentication for CI/CD pipelines"],
      ["APIOps", "GitOps workflow for APIM — extract/apply config via pipeline"],
      ["Deployment Slot", "Staging slot for zero-downtime swap deployments"],
      ["Zip Deploy", "Package-based Logic Apps/Functions deployment method"],
      ["Bicep Module", "Reusable Bicep component — one per resource type"],
      ["Environment Approval Gate", "Manual approval required before deploying to higher env"]
    ],
    qa: [
      { q: "How do you deploy Logic Apps Standard via CI/CD?", a: "Logic Apps Standard is a zip-deployed app on App Service. The workflow definition files (workflow.json per workflow) live in the project directory alongside connections.json and host.json. CI/CD pipeline: (1) GitHub Actions triggered on push to main. (2) azure/login with OIDC — no stored secrets. (3) Compress the Logic Apps project: zip -r logicapp.zip . -x '.git/*'. (4) Deploy: az logicapp deployment source config-zip --name $LAName --resource-group $RG --src logicapp.zip. (5) Verify: check deployment status and run a test trigger. For environment promotion: separate workflows for Dev (auto-deploy on merge), Test (deploy on successful Dev), Prod (deploy on manual approval of Test). Connections in connections.json reference Named Values or use Managed Identity — no environment-specific credentials in the codebase. Parameter substitution per environment is handled by App Settings (set via Bicep in the same pipeline run before zip deploy)." }
    ],
    diagram: `CI/CD PIPELINE FOR INTEGRATION

GitHub Push → GitHub Actions Workflow
  ├── Bicep What-if (preview infra changes)
  ├── Bicep Deploy (Service Bus, APIM, Storage, Key Vault)
  ├── RBAC Assignments (MI → Service Bus, Key Vault roles)
  ├── Function App Zip Deploy
  ├── Logic Apps Standard Zip Deploy
  └── APIM APIOps Apply (APIs, policies, products)

Environment Flow:
feature/* → dev (auto) → test (auto) → staging (auto) → prod (manual gate)

ZERO-SECRET DEPLOYMENT
GitHub → [OIDC Token] → Entra ID → [Azure Token] → Deployment`
  },

  topic19: {
    id: "topic19", num: "19", title: "Hybrid Integration & BizTalk", day: "SUN",
    badge: "pending", badgeLabel: "PENDING",
    desc: "BizTalk migration, on-premises connectivity, hybrid patterns — your strongest differentiator.",
    concepts: [
      { title: "BizTalk Migration Approach", body: "My migration methodology: (1) Discovery — inventory all BizTalk artefacts (orchestrations, schemas, maps, pipelines, adapters, send/receive ports). (2) Assessment — categorise by complexity: Simple (direct port to Logic App), Medium (requires redesign), Complex (requires Durable Functions or custom code). (3) Prioritise by business value and risk. (4) Pilot — migrate 2-3 representative flows to validate patterns. (5) Factory model — scale migration using established patterns. Tools: BizTalk Migrator (Microsoft OSS tool) automates schema/map conversion. Logic Apps Standard supports XSLT maps and XSD schemas natively. On the Insurance project: 23 orchestrations categorised as 12 simple, 7 medium, 4 complex. Migrated in 4 sprints of 3 weeks each." },
      { title: "On-Premises Connectivity", body: "Three options: On-premises Data Gateway (Logic Apps, Power Platform — install on on-prem server, connects to Azure relay, no inbound firewall changes required), Azure Relay / Hybrid Connections (application-level, works for any TCP/HTTP service, no VPN required, install Hybrid Connection Manager on-prem), VPN Gateway / ExpressRoute (network-level, full VNet connectivity to on-prem, required for high-throughput or low-latency scenarios). For most Logic Apps scenarios: On-premises Data Gateway for SQL Server, File System, SharePoint on-prem. For Function Apps: Hybrid Connections or ExpressRoute. ExpressRoute: dedicated private connectivity, no internet routing, guaranteed bandwidth — required for financial clients with latency SLAs." },
      { title: "Adapter Equivalents in Azure", body: "BizTalk MQSC adapter → Service Bus + Azure Relay or IBM MQ on Azure VM. FILE adapter → Blob Storage trigger + Event Grid, or Azure File Share. SFTP adapter → Logic Apps built-in SFTP connector (Standard). SQL adapter → Logic Apps SQL Server connector or Function with SQL binding. SOAP/WCF adapter → APIM SOAP import + Logic Apps HTTP action. SAP adapter → Azure Logic Apps SAP connector (requires On-premises Data Gateway + SAP NCo library). AS2/EDIFACT → Logic Apps Integration Account with trading partner agreements. FTP → Logic Apps FTP connector." }
    ],
    terms: [
      ["Orchestration", "BizTalk: stateful workflow engine → Logic App"],
      ["Pipeline", "BizTalk: message processing stages → Function App"],
      ["Map", "BizTalk: XSLT transformation → Logic Apps XSLT/Liquid map"],
      ["Schema", "BizTalk: XSD message definition → JSON Schema / XSD in Standard"],
      ["Adapter", "BizTalk: protocol connector → Azure Logic Apps connector"],
      ["Send/Receive Port", "BizTalk: message endpoint → Logic App trigger/action"],
      ["On-premises Data Gateway", "Agent on-prem for Logic Apps connectivity to local resources"],
      ["Hybrid Connections", "Azure Relay: application-level hybrid connectivity"],
      ["ExpressRoute", "Private dedicated connectivity between on-prem and Azure"],
      ["BizTalk Migrator", "Microsoft OSS tool for automated BizTalk → Azure conversion"]
    ],
    qa: [
      { q: "How did you approach the BizTalk to Azure migration on the Insurance project?", a: "I led a structured 3-phase migration. Phase 1: Assessment (3 weeks) — I inventoried all 23 BizTalk orchestrations, 47 schemas, 31 maps, 18 send ports and 12 receive locations. Used the Microsoft BizTalk Migration Tool to auto-convert schemas and maps — it handled about 60% automatically, the rest required manual adjustment. I rated each orchestration: Simple (1-1 port to Logic App, ~12), Medium (needs pattern redesign, ~7), Complex (multiple compensating transactions or high performance, ~4 — went to Durable Functions). Phase 2: Pilot (2 weeks) — migrated 3 representative flows (one per category) to validate the target patterns. This surfaced the XSLT compatibility issues (BizTalk custom functoids need custom code in Functions) and the session handling for ordered processing. Phase 3: Factory (10 weeks) — team of 4 engineers executed migration using the established patterns. Key decisions: all receive locations became Service Bus queues (not HTTP — more resilient), all orchestrations became Logic Apps Standard (not Consumption — multi-workflow, VNet, local dev). The result: 100% of BizTalk functionality re-platformed with improved observability and zero production incidents during cutover (we ran parallel for 2 weeks)." },
      { q: "How does the on-premises Data Gateway work technically?", a: "The On-premises Data Gateway is an agent installed on a Windows server in the on-premises network. It establishes an outbound connection to Azure Service Bus Relay — no inbound firewall changes needed. When a Logic App action (e.g., SQL Server connector) needs to reach an on-prem database: Logic App sends the query to the gateway service in Azure → Azure Service Bus Relay forwards to the on-prem gateway agent → agent executes the query against the local SQL Server → returns results through the relay → Logic App receives the response. Considerations: the gateway server must have outbound HTTPS (443) to Azure. For HA: install the gateway on 2+ servers and add them to a cluster — Azure load-balances across all cluster members. Latency: adds 20-100ms depending on connection quality. For high-frequency queries this can be a bottleneck — in that case, use ExpressRoute with private endpoints instead." }
    ],
    diagram: `BIZTALK → AZURE MIGRATION MAP

BIZTALK                         AZURE EQUIVALENT
───────                         ────────────────
Receive Location (FILE)    →    Event Grid → Function App (Blob trigger)
Receive Location (SQL)     →    Logic App SQL polling trigger
Receive Location (MSMQ)    →    Service Bus Queue trigger
Orchestration              →    Logic App Standard (stateful workflow)
Map (XSLT)                 →    Integration Account XSLT Map
Custom Functoid            →    Azure Function (helper)
Send Port (SOAP)           →    APIM + HTTP Action
Send Port (FILE)           →    Logic App Blob Storage Action
Suspend Queue              →    Service Bus Dead-Letter Queue
BizTalk Admin Console      →    Azure Monitor + Logic App Run History
BAM                        →    Application Insights + Log Analytics`
  },

  topic20: {
    id: "topic20", num: "20", title: "AI Integration & LLM Pipelines", day: "SUN",
    badge: "pending", badgeLabel: "PENDING",
    desc: "Copilot integration, Azure OpenAI, Pallavi's 5-stage enrichment pipeline — your unique differentiator.",
    concepts: [
      { title: "Pallavi's 5-Stage AI Enrichment Pipeline", body: "This is your strongest differentiator. At EY I designed a sequential, fault-tolerant AI enrichment pipeline for client profiling. Five stages: (1) Pattern Detection — regex-based analysis producing coverage scores per field; (2) PII Detection — Azure AI Language service with entity recognition, category and confidence score per entity; (3) Anomaly Detection — Azure Anomaly Detector API flagging statistical outliers in numeric series; (4) Rule Checking — business policy rules applied to enriched data, producing flag array; (5) Quality Scoring — composite score (0-100) from all prior stage outputs, stored as JSONB in PostgreSQL. Each stage: reads from previous stage output, processes via Azure Function App, writes structured output. Failures: each stage has retry with exponential backoff, failed stage writes to DLQ. Fault isolation: stage 3 failure does not prevent stage 4 from processing other records. Full audit trail: every stage output persisted to Azure Table Storage for replay and explainability." },
      { title: "Azure OpenAI & RAG Pattern", body: "Azure OpenAI Service provides access to GPT-4, text-embedding-ada-002, DALL-E behind a private Azure endpoint. For enterprise integration: RAG (Retrieval-Augmented Generation) pattern — index your documents (policy manuals, claim forms) in Azure AI Search, at query time embed the question and retrieve relevant chunks, combine chunks + question into a prompt, send to Azure OpenAI GPT-4 for grounded answer. In Logic Apps: HTTP action to Azure OpenAI completions endpoint with Managed Identity auth. In Function Apps: Azure.AI.OpenAI SDK with DefaultAzureCredential." },
      { title: "Spec-Driven Development with AI", body: "My approach on the enrichment pipeline: used Claude to decompose high-level requirements into detailed technical specifications (input schema, output schema, error handling, SLA per stage). This structured spec became the contract between developers and QA — GitHub Copilot was then used to implement each stage against the spec, significantly reducing the time to first working code. Key lesson: AI-assisted development works best with clear specs. Copilot's suggestions were most accurate when the function signature and JSDoc/XML comments captured the spec precisely. Measured: design to working code time reduced by ~40% compared to prior non-AI delivery. I now advocate spec-driven AI-assisted development as a delivery methodology for complex integration projects." }
    ],
    terms: [
      ["RAG", "Retrieval-Augmented Generation — ground LLM responses in your documents"],
      ["Azure OpenAI Service", "Private Azure-hosted GPT-4, embedding, DALL-E endpoints"],
      ["Azure AI Search", "Vector + keyword search for RAG document retrieval"],
      ["PII Detection", "Azure AI Language: identify personal data fields in text"],
      ["Anomaly Detector", "Azure AI: statistical anomaly detection in time series data"],
      ["Spec-Driven Development", "Write detailed specs first, implement against them"],
      ["GitHub Copilot", "AI coding assistant — most effective with clear specs/comments"],
      ["Grounding", "Providing factual context to LLM to reduce hallucination"],
      ["Embedding", "Vector representation of text for semantic search"],
      ["DefaultAzureCredential", "Azure SDK: tries MI, env vars, CLI — no hardcoded credentials"]
    ],
    qa: [
      { q: "Describe your AI enrichment pipeline in detail — what problem did it solve?", a: "The client had a large dataset of financial profiles — customer data aggregated from multiple systems — with inconsistent quality. The business needed to assess data quality before using it for risk modelling. I designed a 5-stage sequential pipeline: Stage 1 (Pattern Detection): for each field, apply regex patterns to determine coverage and format compliance — outputs a coverage_score per field. Stage 2 (PII Detection): call Azure AI Language's entity recognition API on free-text fields — outputs PII category (PersonName, Address, IBAN) and confidence score, used to flag records for masking before downstream ML training. Stage 3 (Anomaly Detection): for numeric time-series fields (transaction amounts over time), call Azure Anomaly Detector — flags statistical outliers with isAnomaly boolean and severity score. Stage 4 (Rule Checking): apply 47 business rules (e.g., 'if income > 0 and employment = 'Unemployed', flag as inconsistent') — outputs array of rule violations. Stage 5 (Quality Scoring): weighted composite of all prior scores into a 0-100 quality score with breakdown — stored as JSONB in PostgreSQL for downstream query. The pipeline ran as Azure Function Apps (one per stage), triggered by Service Bus queue per stage, with correlation ID threading through all stages. Result: data quality visibility went from zero to a dashboard, and the ML team could filter to quality score > 70 records, improving model accuracy by 18%." },
      { q: "How would you integrate Azure OpenAI into an existing Logic Apps integration workflow?", a: "Two approaches depending on complexity. Simple: HTTP action in Logic App calling Azure OpenAI REST API directly. Set the endpoint to your Azure OpenAI deployment URL, authenticate via Managed Identity (assign the Logic App MI 'Cognitive Services OpenAI User' role on the Azure OpenAI resource). Compose the request body with the prompt and message history. Parse the JSON response to extract choices[0].message.content. More complex (RAG): Logic App HTTP trigger → Function App (orchestrator) → Azure AI Search query (retrieve relevant document chunks) → compose prompt with retrieved context → Azure OpenAI chat completion → return grounded response. The Function App handles the multi-step retrieval + generation, Logic App handles the routing and retry. For streaming responses (token-by-token): not native in Logic Apps — use Function App with streaming HTTP response. Production considerations: rate limits (TPM — tokens per minute, RPM — requests per minute), implement retry with exponential backoff on 429 responses, use Azure Monitor to track token consumption, implement content filtering for compliance." }
    ],
    diagram: `5-STAGE AI ENRICHMENT PIPELINE

[Source Data] → [Service Bus: stage-1-queue]
                        ↓
              [Function: PatternDetector]
              → Output: {field_coverage: {}, regex_scores: {}}
              → [Service Bus: stage-2-queue]
                        ↓
              [Function: PIIDetector] (Azure AI Language)
              → Output: {pii_entities: [{category, confidence}]}
              → [Service Bus: stage-3-queue]
                        ↓
              [Function: AnomalyDetector] (Azure Anomaly Detector)
              → Output: {anomalies: [{field, isAnomaly, severity}]}
              → [Service Bus: stage-4-queue]
                        ↓
              [Function: RuleChecker] (47 business rules)
              → Output: {violations: [{rule_id, severity}]}
              → [Service Bus: stage-5-queue]
                        ↓
              [Function: QualityScorer]
              → Output: {quality_score: 85, breakdown: {...}}
              → [PostgreSQL: client_profiles JSONB]`
  }
};

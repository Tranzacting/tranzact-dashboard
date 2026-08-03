# Alpha

## **Use Case 1: Create Inward + Purchase Invoice**

* User types "received materials from Surya demo supplier, create inward and purchase invoice"
* AI identifies supplier and intent to create inward and purchase invoice
* AI searches open purchase orders for the supplier with pending delivery
* AI asks user to select PO if multiple options are found
* User selects PO
* AI loads item list with pending quantities from the selected PO
* AI shows items and asks for confirmation to create inward
* User confirms or edits quantities
* AI creates inward in draft linked to the PO
* AI creates purchase invoice using PO data
* AI returns inward link and purchase invoice link
* AI asks → "Want to create GRN?"

APIs:

* <https://be.letstranzact.com/documents/all_documents/api/>
  * **filters**: {document_type: "po", creation_status: "sent", status: "all_pending"}
  * **search:** {counter_party_name: {type: "str", value: "Surya demo supplier"}}


## **Use Case 2: Create Inward + Purchase Invoice from Supplier Invoice Image**

* User uploads invoice image or says "create inward from this invoice"
* AI reads the image and extracts supplier, invoice number, date, PO number, items, quantities, rates, and amounts
* AI identifies the supplier and fetches the PO using the extracted PO number
* AI loads PO details including item list and pending quantities
* AI compares invoice items with PO and highlights any quantity or rate mismatches
* AI shows a summary of extracted invoice data and PO details
* AI asks for confirmation to proceed
* User confirms or edits data
* AI creates inward (GRN) in draft linked to the PO
* AI creates purchase invoice using invoice data
* AI returns inward link and purchase invoice link


## **Use Case 3: Log Customer Payment and Auto-Adjust Against Invoices (FIFO) \[Alpha\]**

* User types "we received payment of 300000 from Merc customer, log payment against invoices in FIFO"
* AI identifies customer, amount, and intent to record payment and allocate to invoices
* AI fetches all open invoices for the customer sorted by oldest first (FIFO)
* AI allocates payment amount sequentially against invoices until amount is exhausted
* AI prepares allocation summary showing invoice-wise adjustment
* AI shows summary and asks for confirmation
* User confirms or edits allocation
* AI creates payment entry and links it to respective invoices
* AI updates invoice statuses to paid or partially paid
* AI returns payment entry link and updated invoice summary

APIs:

* <https://be.letstranzact.com/payments/datatable/fetch/>
  * **filters**: {option: "ledger_consolidated", payment_status: "receivable"}
  * **search**: {counter_party_name: {type: "str", value: "Merc Demo Buyer"}}
  * **pagination**: {sort_by: \["linkedDocumentPaymentDate"\]}


## **Use Case 4: Smart Approval Assistant (PO & Customer Approvals)**

* User types "check all pending approvals and suggest"
* AI fetches all pending approvals including purchase orders and customer-related approvals
* AI analyzes each purchase order for key signals like pending supplier payments, open POs, recent increase in item prices, and alternate lower prices from other suppliers
* AI analyzes customer approvals for signals like outstanding receivables, credit limits, payment delays, and order history
* AI generates recommendations for each approval such as approve, hold, or review with reasons
* AI shows a summarized view with actionable suggestions and key insights
* User reviews suggestions and selects approvals to proceed
* AI executes approvals or rejections based on user input
* AI updates system and returns confirmation of actions taken

APIs:

* <https://be.letstranzact.com/approval/datatable/fetch-received/>
  * ==approvalStatus:== "pending"
  * Need to modify API to return uuid for each document
* call <https://be.letstranzact.com/api/v3/documents/insights/price-history/list> for each
  * ==filters:== {doc_id: "30dad64c-507a-4a8f-bb3c-eae260d27080", doc_type: 4}


## **Use Case 5: Create Task from Natural Language**

* User types "create task for Abhishek - create PO for Surya supplier by tomorrow"
* AI identifies assignee as Abhishek, task title, and due date as tomorrow
* AI identifies related entities like supplier Surya for context
* AI creates a task with description, assignee, due date, and linked supplier
* AI assigns the task to Abhishek and adds it to task list
* AI sends notification to Abhishek
* AI returns task link and confirmation to user


## **Use Case 11: Check Current Stock**

* User types "what is current stock of Item A"
* AI identifies item
* AI fetches stock across warehouses
* AI shows total stock and location-wise breakdown
* AI highlights low stock if applicable

## **Use Case 13: Get Order Status**

* User types "status of order SO-1023"
* AI fetches order details
  * Gets transaction id from the OC
  * Gets all details of OC from here -
    * <https://be.letstranzact.com/transaction/transaction-details/api/?transaction_id=4600520>
  * To get process details
    * Use <https://be.letstranzact.com/documents/document/get_related_process/>  to get process id and stage
    * User process id to get process details and let AI summarize the data - <https://be.letstranzact.com/production/general/view/?id=3190426&doc_type=69&action=view>
* AI shows order status, dispatch status, and payment status, production status


## **Use Case 16:** Create Full Traceability Report

* User writes-
  * Give full traceability report for BAR00089 
  * Give full traceability report for Invoice 4008
* I will give an API end-point to get the data


## **Use Case 17:** Document Number search and summary

* User enters a document number or itemid
* AI identifies what kind of document it is from document number series
* If AI is able to identify then well, otherwise ask user
* AI then calls doc view / payment view / item view / bom view / process view API
* let AI summarize data


## **Use Case 18:** Send whatsapp and email → Subject, Phone number, email, email body


\
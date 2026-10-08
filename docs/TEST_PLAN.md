# ParaBank Test Plan

**Application under test:** https://parabank.parasoft.com/parabank/
**Framework:** Playwright + TypeScript
**Browsers:** Chromium, Firefox, WebKit
**Status:** In progress. Implemented: `tests/ui/` register, auth, lookup, accounts, open-account, transfer and bill-pay specs.

ParaBank is a public demo of an online bank, built by Parasoft. It has no real money, but the environment is **shared**: anyone on the internet can create users, move money, or reset the database from the Admin page. The plan is designed around that.

---

## 1. Scope

### In scope

| Area | Pages | Requires login |
|---|---|---|
| Registration | `register.htm` | No |
| Login / Logout | `index.htm` (left panel), `login.htm`, `logout.htm` | No |
| Forgot login info | `lookup.htm` | No |
| Accounts Overview | `overview.htm` | Yes |
| Account Activity | `activity.htm?id=<accountId>` | Yes |
| Open New Account | `openaccount.htm` | Yes |
| Transfer Funds | `transfer.htm` | Yes |
| Bill Pay | `billpay.htm` | Yes |
| Find Transactions | `findtrans.htm` | Yes |
| Update Contact Info | `updateprofile.htm` | Yes |
| Request Loan | `requestloan.htm` | Yes |
| Customer Care | `contact.htm` | No |
| Static pages and navigation | `about.htm`, `services.htm`, `sitemap.htm`, header, footer | No |
| REST API | `services/bank/...` (docs: `api-docs/index.html`) | No auth header |

### Out of scope

- **Admin page actions** (`admin.htm`): *Initialize*, *Clean*, JMS shutdown, changing the data access mode, balances or the loan provider. These change the site for **every** user. Only a read-only check that the page renders is included.
- SOAP services (Bookstore, the LoanProcessor WSDL) and the WSDL/WADL contracts.
- External Parasoft links (Products, Locations, parasoft.com). Only check that the `href` is correct; don't follow them.
- Performance, load and security/penetration testing. This is a shared public server.
- Visual pixel comparison. The site's look is outside our control and can change.

---

## 2. Test approach

1. **UI end-to-end tests** cover the user journeys on every page.
2. **API tests** (Playwright's `request` fixture) cover the same banking rules faster and set up data for UI tests. Examples: create an account through the API, then check it in the UI.
3. **Page Object Model.** Each page gets one class in `pages/`, and tests never use raw selectors.
4. **Fixtures** provide a freshly registered, logged-in user (`loggedInPage`) and a data factory (see section 4).
5. **Tags** let you run subsets:
   - `@smoke`: about 10 critical-path tests that run on every push.
   - `@regression`: everything.
   - `@api`: API-only tests.
   - `@known-issue`: tests that document current buggy behaviour (see section 6).

### Test data strategy

- **Every test registers its own user**, with a unique username such as `qa_<timestamp>_<random>` and a **unique SSN**. Never rely on a pre-existing account like `john/demo`, because other people change or delete it.
- Usernames must be **20 characters or fewer** (see KI-08), so use a short form such as `qa_<base36 timestamp>_<4 random>`.
- A new user always gets one CHECKING account. Its starting balance comes from the global Admin "Init. Balance" setting, $515.50 when observed. Tests should **read the starting balance** rather than hard-code it, and assert on *differences*: balance before vs. after.
- Generate test data (names, addresses, amounts) in `utils/testData.ts`, so it's never copy-pasted.

### Environment risks and mitigations

| Risk | Mitigation |
|---|---|
| Someone resets the DB mid-run, so users disappear | Each test makes its own user, and CI uses retries (already `retries: 2` on CI) |
| The site is slow or down | Reasonable timeouts, plus a `@smoke` health check that runs first |
| Global admin settings changed by others (init balance, loan provider) | Assert relative values, and read the loan provider from the response instead of assuming it |
| Rate limiting or hammering a public server | Keep the number of parallel workers low (2–3). Cloudflare returns 429 / "Error 1015 You are being rate limited" after roughly 50 registration tests in a few minutes, and the ban lasts several minutes. Don't run all three browsers back to back locally |

---

## 3. Test cases

Priority: **P1** = critical path / smoke, **P2** = main functionality, **P3** = edge cases and validation.

### 3.1 Registration (`REG`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| REG-01 | Register with all valid fields | Page shows "Welcome `<username>`" and "Your account was created successfully. You are now logged in."; the Account Services menu is visible | P1 |
| REG-02 | Submit an empty form | A required message under each field: First name, Last name, Address, City, State, Zip Code, Social Security Number, Username, Password, Password confirmation | P2 |
| REG-03 | Password and Confirm don't match | "Passwords did not match." | P2 |
| REG-04 | Username already taken | "This username already exists." | P2 |
| REG-05 | Phone # left empty (optional field) | Registration succeeds | P3 |
| REG-06 | Each required field missing individually (data-driven) | Only that field's error is shown | P3 |
| REG-07 | New user lands with exactly one CHECKING account | The Overview shows 1 account with a balance > 0 | P2 |

### 3.2 Login / Logout (`AUTH`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| AUTH-01 | Log in with valid credentials | Redirected to the Accounts Overview; the left panel shows "Welcome `<first> <last>`" | P1 |
| AUTH-02 | Wrong password / unknown user | "The username and password could not be verified." | P1 |
| AUTH-03 | Empty username and password | "Please enter a username and password." | P2 |
| AUTH-04 | Log out | Returns to the home page; the login form is shown and the account menu is hidden | P1 |
| AUTH-05 | Open a protected page (`overview.htm`) when logged out | User is denied access, not shown data. *Currently shows "An internal error has occurred" — see KI-02* | P2 |
| AUTH-06 | Browser back button after logout | No account data is visible | P3 |

### 3.3 Forgot Login Info (`LOOK`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| LOOK-01 | Look up a registered user with correct details | Shows the username and password | P2 |
| LOOK-02 | Submit an empty form | Required messages for First name, Last name, Address, City, State, Zip Code and SSN | P3 |
| LOOK-03 | Details that don't match any customer | "The customer information provided could not be found." | P3 |

### 3.4 Accounts Overview and Account Activity (`ACC`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| ACC-01 | Overview lists every account with Balance and Available Amount | One row per account plus a **Total** row | P1 |
| ACC-02 | Total equals the sum of all account balances | Arithmetic is correct after opening accounts and transfers | P2 |
| ACC-03 | Clicking an account number opens Account Details | Shows Account Number, Account Type (CHECKING/SAVINGS/LOAN), Balance and Available, matching the overview | P2 |
| ACC-04 | Activity for a brand-new account | "No transactions found." | P3 |
| ACC-05 | Activity after a transfer | The transaction is listed with the date, description, and debit/credit amount | P2 |
| ACC-06 | Filter activity by Type (Credit / Debit) | Only matching transactions are shown | P3 |
| ACC-07 | Filter activity by month | Only that month's transactions are shown | P3 |
| ACC-08 | Clicking a transaction opens its Transaction Details | ID, date, description, type and amount are shown | P3 |

### 3.5 Open New Account (`OPEN`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| OPEN-01 | Open a CHECKING account funded from an existing account | "Account Opened!" and a new account number is shown | P1 |
| OPEN-02 | Open a SAVINGS account | Same as above; Account Details shows type SAVINGS | P2 |
| OPEN-03 | The new account appears in the Overview with a $100.00 balance | The source account drops by $100.00 (the page says "A minimum of $100.00 must be deposited") | P2 |
| OPEN-04 | The new account number link opens its Account Details | Details are correct | P3 |
| OPEN-05 | The new account appears in the From/To dropdowns on Transfer, Bill Pay and Loan | Dropdowns are refreshed | P3 |

### 3.6 Transfer Funds (`TRF`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| TRF-01 | Transfer a valid amount between two of your own accounts | "Transfer Complete!" with the amount and both account numbers; balances change by exactly that amount | P1 |
| TRF-02 | Both accounts show the transaction in their Activity | "Funds Transfer Sent" (debit) and "Funds Transfer Received" (credit) | P2 |
| TRF-03 | Decimal amount (e.g. 10.55) | Balances are correct to the cent | P3 |
| TRF-04 | Empty amount | A validation message. *Currently "An internal error has occurred" — KI-03* | P3 |
| TRF-05 | Non-numeric / negative / zero amount | Rejected with a validation message. *Currently "abc" gives an internal error (KI-03); -10 and 0 are transferred (KI-09)* | P3 |
| TRF-06 | Amount larger than the balance | Should be rejected. *Currently accepted — KI-04* | P3 |
| TRF-07 | From and To set to the same account | Should be blocked. *Currently allowed — KI-05* | P3 |

### 3.7 Bill Pay (`BILL`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| BILL-01 | Pay a bill with valid payee details | "Bill Payment Complete", showing the payee name, amount and source account | P1 |
| BILL-02 | The source account balance decreases by the amount; Activity shows "Bill Payment to `<payee>`" | Correct | P2 |
| BILL-03 | Submit an empty form | Required messages for Payee name, Address, City, State, Zip Code, Phone number, Account number (×2), and "The amount cannot be empty." | P2 |
| BILL-04 | Account # and Verify Account # differ | "The account numbers do not match." | P2 |
| BILL-05 | Non-numeric amount | "Please enter a valid amount." | P3 |
| BILL-06 | Non-numeric account number | A validation message | P3 |
| BILL-07 | Amount larger than the balance | Should be rejected. *Currently accepted — KI-10* | P3 |

### 3.8 Find Transactions (`FIND`)

Prerequisite: the user has made at least one transfer and one bill payment.

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| FIND-01 | Find by Transaction ID | Exactly that transaction is returned | P2 |
| FIND-02 | Find by Date (MM-DD-YYYY, today) | Today's transactions are returned | P2 |
| FIND-03 | Find by Date Range covering today | Today's transactions are returned | P2 |
| FIND-04 | Find by Amount | Transactions with that amount are returned | P2 |
| FIND-05 | Empty amount | "Invalid amount" | P3 |
| FIND-06 | Invalid date format (e.g. 13-45-2020) | A validation message. *Currently returns an empty results table — KI-06* | P3 |
| FIND-07 | Search with no matches | An empty results table, no error | P3 |
| FIND-08 | Results are limited to the selected account | Transactions from other accounts are not shown | P3 |

### 3.9 Update Contact Info (`PROF`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| PROF-01 | The form is pre-filled with the current profile | Values match the registration data | P2 |
| PROF-02 | Update the address and phone | "Profile Updated"; reloading the page shows the new values | P1 |
| PROF-03 | Clear a required field (e.g. City) | "City is required." (or that field's message) | P3 |
| PROF-04 | The updated first/last name is shown in the left panel greeting | Greeting updates | P3 |

### 3.10 Request Loan (`LOAN`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| LOAN-01 | A small loan with an affordable down payment | Status **Approved**, "Congratulations, your loan has been approved.", and a new account number | P1 |
| LOAN-02 | The approved loan creates a LOAN-type account in the Overview; the source account is debited by the down payment | Correct | P2 |
| LOAN-03 | Loan amount too high for the available funds | Status **Denied**, "We cannot grant a loan in that amount with your available funds." | P2 |
| LOAN-04 | Down payment larger than the source account balance | Denied, with a message about insufficient funds | P3 |
| LOAN-05 | Empty / non-numeric amount or down payment | A validation message | P3 |
| LOAN-06 | The response shows Loan Provider and Date | Fields are present (don't hard-code the provider name; it comes from the Admin setting) | P3 |

### 3.11 Customer Care (`CON`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| CON-01 | Submit a valid message | "Thank you `<name>`" and "A Customer Care Representative will be contacting you." | P2 |
| CON-02 | Submit an empty form | Name, Email, Phone and Message are each required | P3 |
| CON-03 | Invalid email format | Should be rejected (check the actual behaviour) | P3 |

### 3.12 Navigation and static content (`NAV`)

| ID | Scenario | Expected result | Priority |
|---|---|---|---|
| NAV-01 | Home page loads with the title "ParaBank \| Welcome \| Online Banking" | Logo, login form, ATM/Online Services and Latest News are visible | P1 |
| NAV-02 | Header links (About Us, Services, Admin Page) and the home/about/contact icons | Each opens the correct page and title | P3 |
| NAV-03 | Footer links (Home, About Us, Services, Products, Locations, Forum, Site Map, Contact Us) | Correct target; external links point to parasoft.com | P3 |
| NAV-04 | Site Map lists all Account Services links | All 8 links work when logged in | P3 |
| NAV-05 | The left menu while logged in has all 8 Account Services links | Each opens the correct page | P2 |
| NAV-06 | The Admin page renders read-only (headings Database, JMS Service, Data Access Mode, Web Service, Application Settings) | Visible. **No buttons clicked** | P3 |

### 3.13 REST API (`API`)

Base URL: `https://parabank.parasoft.com/parabank/services/bank`. Send `Accept: application/json`.

| ID | Endpoint | Scenario | Priority |
|---|---|---|---|
| API-01 | `GET /login/{username}/{password}` | Valid credentials return the customer; invalid ones return an error status | P1 |
| API-02 | `GET /customers/{customerId}` | Returns the customer profile (id, name, address, phone, SSN) | P2 |
| API-03 | `GET /customers/{customerId}/accounts` | Lists the customer's accounts | P2 |
| API-04 | `GET /accounts/{accountId}` | Returns the account (id, customerId, type, balance) | P2 |
| API-05 | `POST /createAccount?customerId&newAccountType&fromAccountId` | Creates an account; the source is debited $100 | P2 |
| API-06 | `POST /transfer?fromAccountId&toAccountId&amount` | Balances change accordingly | P1 |
| API-07 | `POST /billpay?accountId&amount` | Pays a bill and debits the account | P3 |
| API-08 | `GET /accounts/{accountId}/transactions` (+ `/amount/{amount}`, `/onDate/{date}`, `/fromDate/{d1}/toDate/{d2}`) | Matches the UI's Find Transactions | P2 |
| API-09 | `GET /transactions/{transactionId}` | Returns the transaction | P3 |
| API-10 | `POST /requestLoan?customerId&amount&downPayment&fromAccountId` | Approved/denied response | P2 |
| API-11 | `POST /customers/update/{customerId}?...` | Updates the profile | P3 |
| API-12 | Unknown customer, account or transaction ID | 4xx with an error message, not a 500 | P3 |

Endpoint names should be confirmed against `api-docs/index.html` (OpenAPI) when implementing.

### 3.14 Cross-feature end-to-end journeys (`E2E`)

| ID | Journey | Priority |
|---|---|---|
| E2E-01 | Register → open a SAVINGS account → transfer $50 into it → verify both balances and the Overview total → log out | P1 |
| E2E-02 | Register → pay a bill → find the transaction by amount → open its details → verify it matches | P2 |
| E2E-03 | Register → request a loan (approved) → verify the new LOAN account and the debited down payment | P2 |
| E2E-04 | Register → update the profile → log out → use Forgot Login Info with the *updated* details → log in with the returned credentials | P2 |

---

## 4. File plan

```
demoBankingTSAutomationPW/
├── .github/workflows/playwright.yml   # exists: runs the tests on GitHub
├── docs/TEST_PLAN.md                  # this document
├── playwright.config.ts               # baseURL, 2–3 workers, screenshots on failure
├── tsconfig.json                      # short import paths: @pages, @api, @fixtures, @utils
├── package.json                       # scripts: test, test:smoke, test:ui, test:api, report
│
├── components/                        # page parts that appear on many pages
│   ├── Header.ts                      # About Us, Services, Admin links, icons
│   ├── LeftMenu.ts                    # login form when logged out; greeting + 8 Account Services links when logged in
│   └── Footer.ts                      # footer links
│
├── pages/                             # one class per page
│   ├── BasePage.ts                    # shared: header, menu, footer, error message
│   ├── HomePage.ts                    # index.htm
│   ├── RegisterPage.ts                # register.htm
│   ├── LookupPage.ts                  # lookup.htm
│   ├── OverviewPage.ts                # overview.htm (reads the accounts table and total)
│   ├── ActivityPage.ts                # activity.htm (details, filters, transaction list)
│   ├── TransactionPage.ts             # transaction.htm (one transaction's details)
│   ├── OpenAccountPage.ts             # openaccount.htm
│   ├── TransferPage.ts                # transfer.htm
│   ├── BillPayPage.ts                 # billpay.htm
│   ├── FindTransactionsPage.ts        # findtrans.htm (4 search modes + results)
│   ├── UpdateProfilePage.ts           # updateprofile.htm
│   ├── RequestLoanPage.ts             # requestloan.htm
│   ├── ContactPage.ts                 # contact.htm
│   ├── StaticPages.ts                 # about, services, sitemap, admin (read-only)
│   └── index.ts                       # exports all pages from one place
│
├── api/
│   ├── ParaBankApi.ts                 # one method per REST endpoint
│   └── types.ts                       # Customer, Account, Transaction, LoanResponse
│
├── fixtures/
│   └── index.ts                       # extends Playwright's test (see below)
│
├── utils/
│   ├── testData.ts                    # makes unique users (username + SSN), payees, addresses
│   ├── money.ts                       # turns "$1,515.50" into 1515.5 and compares to the cent
│   └── dates.ts                       # today's date as MM-DD-YYYY for Find Transactions
│
└── tests/
    ├── ui/
    │   ├── register.spec.ts           # REG-01…07
    │   ├── auth.spec.ts               # AUTH-01…06
    │   ├── lookup.spec.ts             # LOOK-01…03
    │   ├── accounts.spec.ts           # ACC-01…08
    │   ├── open-account.spec.ts       # OPEN-01…05
    │   ├── transfer.spec.ts           # TRF-01…07
    │   ├── bill-pay.spec.ts           # BILL-01…07
    │   ├── find-transactions.spec.ts  # FIND-01…08
    │   ├── update-profile.spec.ts     # PROF-01…04
    │   ├── request-loan.spec.ts       # LOAN-01…06
    │   ├── contact.spec.ts            # CON-01…03
    │   └── navigation.spec.ts         # NAV-01…06
    ├── api/
    │   ├── customers.spec.ts          # API-01, 02, 11
    │   ├── accounts.spec.ts           # API-03, 04, 05
    │   ├── transactions.spec.ts       # API-06, 07, 08, 09
    │   ├── loans.spec.ts              # API-10
    │   └── errors.spec.ts             # API-12
    └── e2e/
        └── journeys.spec.ts           # E2E-01…04
```

### Fixtures (`fixtures/index.ts`)

| Fixture | What it provides |
|---|---|
| `user` | Data for a new, unique user. Not registered yet; used by registration tests |
| `registeredUser` | A user that's already registered, with their customer ID and first account ID |
| `loggedInPage` | A browser page already logged in as `registeredUser`. Most tests start here |
| `api` | A ready-to-use `ParaBankApi`, for fast data setup. For example, make a transfer through the API before a Find Transactions UI test |

### Conventions

- **One spec file per test plan area**, so a test ID like `TRF-04` always points to one file.
- **Each test title starts with its ID**, e.g. `test('TRF-04 empty amount shows validation', …)`, so a single case can be run with `--grep TRF-04`.
- **Shared page parts live in `components/`.** The left menu changes depending on whether you're logged in, and nearly every page has it.
- **All dollar amounts go through `utils/money.ts`**, so rounding is handled in one place.
- **Tests never use raw selectors.** Selectors live only in `pages/` and `components/`.
- **`tests/example.spec.ts` is deleted** when real tests are added.
- **No `.env` file or `test-data/` folder for now.** The site address is fixed and all data is generated per test.

### Config changes when implementation starts

- Set `baseURL: 'https://parabank.parasoft.com/parabank/'`.
- Limit `workers` to 2–3.
- Keep `trace: 'on-first-retry'` and add `screenshot: 'only-on-failure'`.
- Add npm scripts: `test:smoke` (`--grep @smoke`), `test:ui`, `test:api`.

---

## 5. Entry and exit criteria

- **Entry:** the site responds on the home page, and registering a new user works.
- **Exit (per run):** all P1 tests pass in all three browsers, and P2 failures are triaged. `@known-issue` tests are expected to fail and don't block a run.

---

## 6. Known issues observed during exploration (10/08/2026)

These were seen manually while writing this plan. Tests covering them should be tagged `@known-issue`. Each test should assert the *correct* behaviour and be marked `test.fail()`, so the test alerts us if the bug is ever fixed.

| ID | Area | Observation |
|---|---|---|
| KI-01 | Lookup | Forgot Login Info returned "could not be found" for a customer that had just been registered and then had its city updated. Needs investigation; it may fail when several customers share an SSN or after a profile update |
| KI-02 | Security | Opening `overview.htm` while logged out shows "An internal error has occurred and has been logged." instead of redirecting to login |
| KI-03 | Transfer | Submitting Transfer with an empty or non-numeric amount (e.g. `abc`) gives an internal error instead of a validation message |
| KI-04 | Transfer | A transfer of $999,999 (far above the balance) is reported as "Transfer Complete!". No overdraft check |
| KI-05 | Transfer | You can transfer to the same account (From = To) |
| KI-06 | Find Transactions | An invalid date (13-45-2020) returns an empty results table with no validation error |
| KI-07 | Registration | Phone # is optional on registration but required on Bill Pay and Update Profile. The rules are inconsistent |
| KI-08 | Registration | A username longer than 20 characters is rejected with "This username already exists." instead of a length message (seen 08/10/2026) |
| KI-09 | Transfer | Negative (-10) and zero amounts are reported as "Transfer Complete!"; a negative transfer moves money backwards |
| KI-10 | Bill Pay | A $999,999 bill payment (far above the balance) is reported as "Bill Payment Complete". No overdraft check |

---

## 7. Suggested implementation order

1. Config, `BasePage`, `HomePage`, `RegisterPage`, user fixture → REG and AUTH smoke tests
2. Overview, Activity and Open Account → ACC and OPEN
3. Transfer and Bill Pay → TRF, BILL, E2E-01
4. Find Transactions, Update Profile, Loan, Contact, Lookup
5. API wrapper and the API suite; switch slow UI setup steps to the API
6. NAV and the remaining P3 edge cases

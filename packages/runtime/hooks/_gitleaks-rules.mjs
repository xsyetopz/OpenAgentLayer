// biome-ignore-all lint: synced upstream Gitleaks rule payload
// biome-ignore-all format: synced upstream Gitleaks rule payload
// Synced from third_party/gitleaks/config/gitleaks.toml plus patches/gitleaks-toml.patch
// Run: bun scripts/sync-gitleaks-rules.mjs

export const GITLEAKS_RULES = [
	{
		"id": "1password-secret-key",
		"description": "Uncovered a possible 1Password secret key, potentially compromising access to secrets in vaults.",
		"regex": {
			"source": "\\bA3-[A-Z0-9]{6}-(?:(?:[A-Z0-9]{11})|(?:[A-Z0-9]{6}-[A-Z0-9]{5}))-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"a3-"
		]
	},
	{
		"id": "1password-service-account-token",
		"description": "Uncovered a possible 1Password service account token, potentially compromising access to secrets in vaults.",
		"regex": {
			"source": "ops_eyJ[a-zA-Z0-9+/]{250,}={0,3}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ops_"
		]
	},
	{
		"id": "adafruit-api-key",
		"description": "Identified a potential Adafruit API Key, which could lead to unauthorized access to Adafruit services and sensitive data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:adafruit)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9_-]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"adafruit"
		]
	},
	{
		"id": "adobe-client-id",
		"description": "Detected a pattern that resembles an Adobe OAuth Web Client ID, posing a risk of compromised Adobe integrations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:adobe)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"adobe"
		]
	},
	{
		"id": "adobe-client-secret",
		"description": "Discovered a potential Adobe Client Secret, which, if exposed, could allow unauthorized Adobe service access and data manipulation.",
		"regex": {
			"source": "\\b(p8e-[a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"p8e-"
		]
	},
	{
		"id": "age-secret-key",
		"description": "Discovered a potential Age encryption tool secret key, risking data decryption and unauthorized access to sensitive information.",
		"regex": {
			"source": "AGE-SECRET-KEY-1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{58}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"age-secret-key-1"
		]
	},
	{
		"id": "airtable-api-key",
		"description": "Uncovered a possible Airtable API Key, potentially compromising database access and leading to data leakage or alteration.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:airtable)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{17})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"airtable"
		]
	},
	{
		"id": "airtable-personnal-access-token",
		"description": "Uncovered a possible Airtable Personal AccessToken, potentially compromising database access and leading to data leakage or alteration.",
		"regex": {
			"source": "\\b(patA-Za-z0-9{14}\\.[a-f0-9]{64})\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"airtable"
		]
	},
	{
		"id": "algolia-api-key",
		"description": "Identified an Algolia API Key, which could result in unauthorized search operations and data exposure on Algolia-managed platforms.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:algolia)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"algolia"
		]
	},
	{
		"id": "alibaba-access-key-id",
		"description": "Detected an Alibaba Cloud AccessKey ID, posing a risk of unauthorized cloud resource access and potential data compromise.",
		"regex": {
			"source": "\\b(LTAI[a-z0-9]{20})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"ltai"
		]
	},
	{
		"id": "alibaba-secret-key",
		"description": "Discovered a potential Alibaba Cloud Secret Key, potentially allowing unauthorized operations and data access within Alibaba Cloud.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:alibaba)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{30})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"alibaba"
		]
	},
	{
		"id": "anthropic-admin-api-key",
		"description": "Detected an Anthropic Admin API Key, risking unauthorized access to administrative functions and sensitive AI model configurations.",
		"regex": {
			"source": "\\b(sk-ant-admin01-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sk-ant-admin01"
		]
	},
	{
		"id": "anthropic-api-key",
		"description": "Identified an Anthropic API Key, which may compromise AI assistant integrations and expose sensitive data to unauthorized access.",
		"regex": {
			"source": "\\b(sk-ant-api03-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sk-ant-api03"
		]
	},
	{
		"id": "artifactory-api-key",
		"description": "Detected an Artifactory api key, posing a risk unauthorized access to the central repository.",
		"regex": {
			"source": "\\bAKCp[A-Za-z0-9]{69}\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"akcp"
		]
	},
	{
		"id": "artifactory-reference-token",
		"description": "Detected an Artifactory reference token, posing a risk of impersonation and unauthorized access to the central repository.",
		"regex": {
			"source": "\\bcmVmd[A-Za-z0-9]{59}\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"cmvmd"
		]
	},
	{
		"id": "asana-client-id",
		"description": "Discovered a potential Asana Client ID, risking unauthorized access to Asana projects and sensitive task information.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:asana)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"asana"
		]
	},
	{
		"id": "asana-client-secret",
		"description": "Identified an Asana Client Secret, which could lead to compromised project management integrity and unauthorized access.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:asana)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"asana"
		]
	},
	{
		"id": "atlassian-api-token",
		"description": "Detected an Atlassian API token, posing a threat to project management and collaboration tool security and data confidentiality.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:(?:ATLASSIAN|[Aa]tlassian)|(?:CONFLUENCE|[Cc]onfluence)|(?:JIRA|[Jj]ira))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{20}[a-f0-9]{4})(?:[\\x60'\"\\s;]|\\\\[nr]|$)|\\b(ATATT3[A-Za-z0-9_\\-=]{186})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"atlassian",
			"confluence",
			"jira",
			"atatt3"
		]
	},
	{
		"id": "authress-service-client-access-key",
		"description": "Uncovered a possible Authress Service Client Access Key, which may compromise access control services and sensitive data.",
		"regex": {
			"source": "\\b((?:sc|ext|scauth|authress)_[a-z0-9]{5,30}\\.[a-z0-9]{4,6}\\.(?:acc)[_-][a-z0-9-]{10,32}\\.[a-z0-9+/_=-]{30,120})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sc_",
			"ext_",
			"scauth_",
			"authress_"
		]
	},
	{
		"id": "aws-access-token",
		"description": "Identified a pattern that may indicate AWS credentials, risking unauthorized cloud resource access and data breaches on AWS platforms.",
		"regex": {
			"source": "\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"a3t",
			"akia",
			"asia",
			"abia",
			"acca"
		]
	},
	{
		"id": "aws-amazon-bedrock-api-key-long-lived",
		"description": "Identified a pattern that may indicate long-lived Amazon Bedrock API keys, risking unauthorized Amazon Bedrock usage",
		"regex": {
			"source": "\\b(ABSK[A-Za-z0-9+/]{109,269}={0,2})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"absk"
		]
	},
	{
		"id": "aws-amazon-bedrock-api-key-short-lived",
		"description": "Identified a pattern that may indicate short-lived Amazon Bedrock API keys, risking unauthorized Amazon Bedrock usage",
		"regex": {
			"source": "bedrock-api-key-YmVkcm9jay5hbWF6b25hd3MuY29t",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"bedrock-api-key-"
		]
	},
	{
		"id": "azure-ad-client-secret",
		"description": "Azure AD Client Secret",
		"regex": {
			"source": "(?:^|[\\\\'\"\\x60\\s>=:(,)])([a-zA-Z0-9_~.]{3}\\dQ~[a-zA-Z0-9_~.-]{31,34})(?:$|[\\\\'\"\\x60\\s<),])",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"q~"
		]
	},
	{
		"id": "beamer-api-token",
		"description": "Detected a Beamer API token, potentially compromising content management and exposing sensitive notifications and updates.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:beamer)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(b_[a-z0-9=_\\-]{44})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"beamer"
		]
	},
	{
		"id": "bitbucket-client-id",
		"description": "Discovered a potential Bitbucket Client ID, risking unauthorized repository access and potential codebase exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:bitbucket)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"bitbucket"
		]
	},
	{
		"id": "bitbucket-client-secret",
		"description": "Discovered a potential Bitbucket Client Secret, posing a risk of compromised code repositories and unauthorized access.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:bitbucket)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"bitbucket"
		]
	},
	{
		"id": "bittrex-access-key",
		"description": "Identified a Bittrex Access Key, which could lead to unauthorized access to cryptocurrency trading accounts and financial loss.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:bittrex)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"bittrex"
		]
	},
	{
		"id": "bittrex-secret-key",
		"description": "Detected a Bittrex Secret Key, potentially compromising cryptocurrency transactions and financial security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:bittrex)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"bittrex"
		]
	},
	{
		"id": "cisco-meraki-api-key",
		"description": "Cisco Meraki is a cloud-managed IT solution that provides networking, security, and device management through an easy-to-use interface.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?i:[\\w.-]{0,50}?(?:(?:[Mm]eraki|MERAKI))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3})(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"meraki"
		]
	},
	{
		"id": "clickhouse-cloud-api-secret-key",
		"description": "Identified a pattern that may indicate clickhouse cloud API secret key, risking unauthorized clickhouse cloud api access and data breaches on ClickHouse Cloud platforms.",
		"regex": {
			"source": "\\b(4b1d[A-Za-z0-9]{38})\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"4b1d"
		]
	},
	{
		"id": "clojars-api-token",
		"description": "Uncovered a possible Clojars API token, risking unauthorized access to Clojure libraries and potential code manipulation.",
		"regex": {
			"source": "CLOJARS_[a-z0-9]{60}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"clojars_"
		]
	},
	{
		"id": "cloudflare-api-key",
		"description": "Detected a Cloudflare API Key, potentially compromising cloud application deployments and operational security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:cloudflare)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9_-]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"cloudflare"
		]
	},
	{
		"id": "cloudflare-global-api-key",
		"description": "Detected a Cloudflare Global API Key, potentially compromising cloud application deployments and operational security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:cloudflare)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{37})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"cloudflare"
		]
	},
	{
		"id": "cloudflare-origin-ca-key",
		"description": "Detected a Cloudflare Origin CA Key, potentially compromising cloud application deployments and operational security.",
		"regex": {
			"source": "\\b(v1\\.0-[a-f0-9]{24}-[a-f0-9]{146})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"cloudflare",
			"v1.0-"
		]
	},
	{
		"id": "codecov-access-token",
		"description": "Found a pattern resembling a Codecov Access Token, posing a risk of unauthorized access to code coverage reports and sensitive data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:codecov)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"codecov"
		]
	},
	{
		"id": "cohere-api-token",
		"description": "Identified a Cohere Token, posing a risk of unauthorized access to AI services and data manipulation.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?i:[\\w.-]{0,50}?(?:cohere|CO_API_KEY)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3})(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-zA-Z0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"cohere",
			"co_api_key"
		]
	},
	{
		"id": "coinbase-access-token",
		"description": "Detected a Coinbase Access Token, posing a risk of unauthorized access to cryptocurrency accounts and financial transactions.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:coinbase)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9_-]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"coinbase"
		]
	},
	{
		"id": "confluent-access-token",
		"description": "Identified a Confluent Access Token, which could compromise access to streaming data platforms and sensitive data flow.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:confluent)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"confluent"
		]
	},
	{
		"id": "confluent-secret-key",
		"description": "Found a Confluent Secret Key, potentially risking unauthorized operations and data access within Confluent services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:confluent)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"confluent"
		]
	},
	{
		"id": "contentful-delivery-api-token",
		"description": "Discovered a Contentful delivery API token, posing a risk to content management systems and data integrity.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:contentful)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{43})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"contentful"
		]
	},
	{
		"id": "curl-auth-header",
		"description": "Discovered a potential authorization token provided in a curl command header, which could compromise the curl accessed resource.",
		"regex": {
			"source": "\\bcurl\\b(?:.*?|.*?(?:[\\r\\n]{1,2}.*?){1,5})[ \\t\\n\\r](?:-H|--header)(?:=|[ \\t]{0,5})(?:\"(?:Authorization:[ \\t]{0,5}(?:Basic[ \\t]([a-z0-9+/]{8,}={0,3})|(?:Bearer|(?:Api-)?Token)[ \\t]([\\w=~@.+/-]{8,})|([\\w=~@.+/-]{8,}))|(?:(?:X-(?:[a-z]+-)?)?(?:Api-?)?(?:Key|Token)):[ \\t]{0,5}([\\w=~@.+/-]{8,}))\"|'(?:Authorization:[ \\t]{0,5}(?:Basic[ \\t]([a-z0-9+/]{8,}={0,3})|(?:Bearer|(?:Api-)?Token)[ \\t]([\\w=~@.+/-]{8,})|([\\w=~@.+/-]{8,}))|(?:(?:X-(?:[a-z]+-)?)?(?:Api-?)?(?:Key|Token)):[ \\t]{0,5}([\\w=~@.+/-]{8,}))')(?:\\B|\\s|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"curl"
		]
	},
	{
		"id": "curl-auth-user",
		"description": "Discovered a potential basic authorization token provided in a curl command, which could compromise the curl accessed resource.",
		"regex": {
			"source": "\\bcurl\\b(?:.*|.*(?:[\\r\\n]{1,2}.*){1,5})[ \\t\\n\\r](?:-u|--user)(?:=|[ \\t]{0,5})(\"(:[^\"]{3,}|[^:\"]{3,}:|[^:\"]{3,}:[^\"]{3,})\"|'([^:']{3,}:[^']{3,})'|((?:\"[^\"]{3,}\"|'[^']{3,}'|[\\w$@.-]+):(?:\"[^\"]{3,}\"|'[^']{3,}'|[\\w${}@.-]+)))(?:\\s|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"curl"
		]
	},
	{
		"id": "databricks-api-token",
		"description": "Uncovered a Databricks API token, which may compromise big data analytics platforms and sensitive data processing.",
		"regex": {
			"source": "\\b(dapi[a-f0-9]{32}(?:-\\d)?)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"dapi"
		]
	},
	{
		"id": "datadog-access-token",
		"description": "Detected a Datadog Access Token, potentially risking monitoring and analytics data exposure and manipulation.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:datadog)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"datadog"
		]
	},
	{
		"id": "defined-networking-api-token",
		"description": "Identified a Defined Networking API token, which could lead to unauthorized network operations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:dnkey)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(dnkey-[a-z0-9=_\\-]{26}-[a-z0-9=_\\-]{52})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dnkey"
		]
	},
	{
		"id": "digitalocean-access-token",
		"description": "Found a DigitalOcean OAuth Access Token, risking unauthorized cloud resource access and data compromise.",
		"regex": {
			"source": "\\b(doo_v1_[a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"doo_v1_"
		]
	},
	{
		"id": "digitalocean-pat",
		"description": "Discovered a DigitalOcean Personal Access Token, posing a threat to cloud infrastructure security and data privacy.",
		"regex": {
			"source": "\\b(dop_v1_[a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"dop_v1_"
		]
	},
	{
		"id": "digitalocean-refresh-token",
		"description": "Uncovered a DigitalOcean OAuth Refresh Token, which could allow prolonged unauthorized access and resource manipulation.",
		"regex": {
			"source": "\\b(dor_v1_[a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dor_v1_"
		]
	},
	{
		"id": "discord-api-token",
		"description": "Detected a Discord API key, potentially compromising communication channels and user data privacy on Discord.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:discord)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"discord"
		]
	},
	{
		"id": "discord-client-id",
		"description": "Identified a Discord client ID, which may lead to unauthorized integrations and data exposure in Discord applications.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:discord)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9]{18})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"discord"
		]
	},
	{
		"id": "discord-client-secret",
		"description": "Discovered a potential Discord client secret, risking compromised Discord bot integrations and data leaks.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:discord)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"discord"
		]
	},
	{
		"id": "doppler-api-token",
		"description": "Discovered a Doppler API token, posing a risk to environment and secrets management security.",
		"regex": {
			"source": "dp\\.pt\\.[a-z0-9]{43}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dp.pt."
		]
	},
	{
		"id": "droneci-access-token",
		"description": "Detected a Droneci Access Token, potentially compromising continuous integration and deployment workflows.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:droneci)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"droneci"
		]
	},
	{
		"id": "dropbox-api-token",
		"description": "Identified a Dropbox API secret, which could lead to unauthorized file access and data breaches in Dropbox storage.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:dropbox)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{15})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dropbox"
		]
	},
	{
		"id": "dropbox-long-lived-api-token",
		"description": "Found a Dropbox long-lived API token, risking prolonged unauthorized access to cloud storage and sensitive data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:dropbox)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{11}(AAAAAAAAAA)[a-z0-9\\-_=]{43})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dropbox"
		]
	},
	{
		"id": "dropbox-short-lived-api-token",
		"description": "Discovered a Dropbox short-lived API token, posing a risk of temporary but potentially harmful data access and manipulation.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:dropbox)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(sl\\.[a-z0-9\\-=_]{135})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dropbox"
		]
	},
	{
		"id": "duffel-api-token",
		"description": "Uncovered a Duffel API token, which may compromise travel platform integrations and sensitive customer data.",
		"regex": {
			"source": "duffel_(?:test|live)_[a-z0-9_\\-=]{43}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"duffel_"
		]
	},
	{
		"id": "dynatrace-api-token",
		"description": "Detected a Dynatrace API token, potentially risking application performance monitoring and data exposure.",
		"regex": {
			"source": "dt0c01\\.[a-z0-9]{24}\\.[a-z0-9]{64}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"dt0c01."
		]
	},
	{
		"id": "easypost-api-token",
		"description": "Identified an EasyPost API token, which could lead to unauthorized postal and shipment service access and data exposure.",
		"regex": {
			"source": "\\bEZAK[a-z0-9]{54}\\b",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"ezak"
		]
	},
	{
		"id": "easypost-test-api-token",
		"description": "Detected an EasyPost test API token, risking exposure of test environments and potentially sensitive shipment data.",
		"regex": {
			"source": "\\bEZTK[a-z0-9]{54}\\b",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"eztk"
		]
	},
	{
		"id": "etsy-access-token",
		"description": "Found an Etsy Access Token, potentially compromising Etsy shop management and customer data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:(?:ETSY|[Ee]tsy))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{24})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"etsy"
		]
	},
	{
		"id": "facebook-access-token",
		"description": "Discovered a Facebook Access Token, posing a risk of unauthorized access to Facebook accounts and personal data exposure.",
		"regex": {
			"source": "\\b(\\d{15,16}(\\||%)[0-9a-z\\-_]{27,40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"facebook"
		]
	},
	{
		"id": "facebook-page-access-token",
		"description": "Discovered a Facebook Page Access Token, posing a risk of unauthorized access to Facebook accounts and personal data exposure.",
		"regex": {
			"source": "\\b(EAA[MC][a-z0-9]{100,})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"eaam",
			"eaac"
		]
	},
	{
		"id": "facebook-secret",
		"description": "Discovered a Facebook Application secret, posing a risk of unauthorized access to Facebook accounts and personal data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:facebook)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"facebook"
		]
	},
	{
		"id": "fastly-api-token",
		"description": "Uncovered a Fastly API key, which may compromise CDN and edge cloud services, leading to content delivery and security issues.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:fastly)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"fastly"
		]
	},
	{
		"id": "finicity-api-token",
		"description": "Detected a Finicity API token, potentially risking financial data access and unauthorized financial operations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:finicity)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"finicity"
		]
	},
	{
		"id": "finicity-client-secret",
		"description": "Identified a Finicity Client Secret, which could lead to compromised financial service integrations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:finicity)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{20})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"finicity"
		]
	},
	{
		"id": "finnhub-access-token",
		"description": "Found a Finnhub Access Token, risking unauthorized access to financial market data and analytics.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:finnhub)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{20})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"finnhub"
		]
	},
	{
		"id": "flickr-access-token",
		"description": "Discovered a Flickr Access Token, posing a risk of unauthorized photo management and potential data leakage.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:flickr)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"flickr"
		]
	},
	{
		"id": "flutterwave-encryption-key",
		"description": "Uncovered a Flutterwave Encryption Key, which may compromise payment processing and sensitive financial information.",
		"regex": {
			"source": "FLWSECK_TEST-[a-h0-9]{12}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"flwseck_test"
		]
	},
	{
		"id": "flutterwave-public-key",
		"description": "Detected a Finicity Public Key, potentially exposing public cryptographic operations and integrations.",
		"regex": {
			"source": "FLWPUBK_TEST-[a-h0-9]{32}-X",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"flwpubk_test"
		]
	},
	{
		"id": "flutterwave-secret-key",
		"description": "Identified a Flutterwave Secret Key, risking unauthorized financial transactions and data breaches.",
		"regex": {
			"source": "FLWSECK_TEST-[a-h0-9]{32}-X",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"flwseck_test"
		]
	},
	{
		"id": "flyio-access-token",
		"description": "Uncovered a Fly.io API key",
		"regex": {
			"source": "\\b((?:fo1_[\\w-]{43}|fm1[ar]_[a-zA-Z0-9+\\/]{100,}={0,3}|fm2_[a-zA-Z0-9+\\/]{100,}={0,3}))(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"fo1_",
			"fm1",
			"fm2_"
		]
	},
	{
		"id": "frameio-api-token",
		"description": "Found a Frame.io API token, potentially compromising video collaboration and project management.",
		"regex": {
			"source": "fio-u-[a-z0-9\\-_=]{64}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"fio-u-"
		]
	},
	{
		"id": "freemius-secret-key",
		"description": "Detected a Freemius secret key, potentially exposing sensitive information.",
		"regex": {
			"source": "[\"']secret_key[\"']\\s*=>\\s*[\"'](sk_[\\S]{29})[\"']",
			"flags": "gi"
		},
		"path": {
			"source": "\\.php$",
			"flags": "gi"
		},
		"keywords": [
			"secret_key"
		]
	},
	{
		"id": "freshbooks-access-token",
		"description": "Discovered a Freshbooks Access Token, posing a risk to accounting software access and sensitive financial data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:freshbooks)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"freshbooks"
		]
	},
	{
		"id": "gcp-api-key",
		"description": "Uncovered a GCP API key, which could lead to unauthorized access to Google Cloud services and data breaches.",
		"regex": {
			"source": "\\b(AIza[\\w-]{35})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"aiza"
		]
	},
	{
		"id": "generic-api-key",
		"description": "Detected a Generic API Key, potentially exposing access to various services and sensitive operations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:access|auth|(?:[Aa]pi|API)|credential|creds|key|passw(?:or)?d|secret|token)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([\\w.=-]{10,150}|[a-z0-9][a-z0-9+/]{11,}={0,3})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"access",
			"api",
			"auth",
			"key",
			"credential",
			"creds",
			"passwd",
			"password",
			"secret",
			"token"
		]
	},
	{
		"id": "github-app-token",
		"description": "Identified a GitHub App Token, which may compromise GitHub application integrations and source code security.",
		"regex": {
			"source": "(?:ghu|ghs)_[0-9a-zA-Z]{36}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ghu_",
			"ghs_"
		]
	},
	{
		"id": "github-fine-grained-pat",
		"description": "Found a GitHub Fine-Grained Personal Access Token, risking unauthorized repository access and code manipulation.",
		"regex": {
			"source": "github_pat_\\w{82}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"github_pat_"
		]
	},
	{
		"id": "github-oauth",
		"description": "Discovered a GitHub OAuth Access Token, posing a risk of compromised GitHub account integrations and data leaks.",
		"regex": {
			"source": "gho_[0-9a-zA-Z]{36}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"gho_"
		]
	},
	{
		"id": "github-pat",
		"description": "Uncovered a GitHub Personal Access Token, potentially leading to unauthorized repository access and sensitive content exposure.",
		"regex": {
			"source": "ghp_[0-9a-zA-Z]{36}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ghp_"
		]
	},
	{
		"id": "github-refresh-token",
		"description": "Detected a GitHub Refresh Token, which could allow prolonged unauthorized access to GitHub services.",
		"regex": {
			"source": "ghr_[0-9a-zA-Z]{36}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ghr_"
		]
	},
	{
		"id": "gitlab-cicd-job-token",
		"description": "Identified a GitLab CI/CD Job Token, potential access to projects and some APIs on behalf of a user while the CI job is running.",
		"regex": {
			"source": "glcbt-[0-9a-zA-Z]{1,5}_[0-9a-zA-Z_-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glcbt-"
		]
	},
	{
		"id": "gitlab-deploy-token",
		"description": "Identified a GitLab Deploy Token, risking access to repositories, packages and containers with write access.",
		"regex": {
			"source": "gldt-[0-9a-zA-Z_\\-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"gldt-"
		]
	},
	{
		"id": "gitlab-feature-flag-client-token",
		"description": "Identified a GitLab feature flag client token, risks exposing user lists and features flags used by an application.",
		"regex": {
			"source": "glffct-[0-9a-zA-Z_\\-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glffct-"
		]
	},
	{
		"id": "gitlab-feed-token",
		"description": "Identified a GitLab feed token, risking exposure of user data.",
		"regex": {
			"source": "glft-[0-9a-zA-Z_\\-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glft-"
		]
	},
	{
		"id": "gitlab-incoming-mail-token",
		"description": "Identified a GitLab incoming mail token, risking manipulation of data sent by mail.",
		"regex": {
			"source": "glimt-[0-9a-zA-Z_\\-]{25}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glimt-"
		]
	},
	{
		"id": "gitlab-kubernetes-agent-token",
		"description": "Identified a GitLab Kubernetes Agent token, risking access to repos and registry of projects connected via agent.",
		"regex": {
			"source": "glagent-[0-9a-zA-Z_\\-]{50}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glagent-"
		]
	},
	{
		"id": "gitlab-oauth-app-secret",
		"description": "Identified a GitLab OIDC Application Secret, risking access to apps using GitLab as authentication provider.",
		"regex": {
			"source": "gloas-[0-9a-zA-Z_\\-]{64}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"gloas-"
		]
	},
	{
		"id": "gitlab-pat",
		"description": "Identified a GitLab Personal Access Token, risking unauthorized access to GitLab repositories and codebase exposure.",
		"regex": {
			"source": "glpat-[\\w-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glpat-"
		]
	},
	{
		"id": "gitlab-pat-routable",
		"description": "Identified a GitLab Personal Access Token (routable), risking unauthorized access to GitLab repositories and codebase exposure.",
		"regex": {
			"source": "\\bglpat-[0-9a-zA-Z_-]{27,300}\\.[0-9a-z]{2}[0-9a-z]{7}\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glpat-"
		]
	},
	{
		"id": "gitlab-ptt",
		"description": "Found a GitLab Pipeline Trigger Token, potentially compromising continuous integration workflows and project security.",
		"regex": {
			"source": "glptt-[0-9a-f]{40}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glptt-"
		]
	},
	{
		"id": "gitlab-rrt",
		"description": "Discovered a GitLab Runner Registration Token, posing a risk to CI/CD pipeline integrity and unauthorized access.",
		"regex": {
			"source": "GR1348941[\\w-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"gr1348941"
		]
	},
	{
		"id": "gitlab-runner-authentication-token",
		"description": "Discovered a GitLab Runner Authentication Token, posing a risk to CI/CD pipeline integrity and unauthorized access.",
		"regex": {
			"source": "glrt-[0-9a-zA-Z_\\-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glrt-"
		]
	},
	{
		"id": "gitlab-runner-authentication-token-routable",
		"description": "Discovered a GitLab Runner Authentication Token (Routable), posing a risk to CI/CD pipeline integrity and unauthorized access.",
		"regex": {
			"source": "\\bglrt-t\\d_[0-9a-zA-Z_\\-]{27,300}\\.[0-9a-z]{2}[0-9a-z]{7}\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glrt-"
		]
	},
	{
		"id": "gitlab-scim-token",
		"description": "Discovered a GitLab SCIM Token, posing a risk to unauthorized access for a organization or instance.",
		"regex": {
			"source": "glsoat-[0-9a-zA-Z_\\-]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"glsoat-"
		]
	},
	{
		"id": "gitlab-session-cookie",
		"description": "Discovered a GitLab Session Cookie, posing a risk to unauthorized access to a user account.",
		"regex": {
			"source": "_gitlab_session=[0-9a-z]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"_gitlab_session="
		]
	},
	{
		"id": "gitter-access-token",
		"description": "Uncovered a Gitter Access Token, which may lead to unauthorized access to chat and communication services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:gitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9_-]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"gitter"
		]
	},
	{
		"id": "gocardless-api-token",
		"description": "Detected a GoCardless API token, potentially risking unauthorized direct debit payment operations and financial data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:gocardless)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(live_[a-z0-9\\-_=]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"live_",
			"gocardless"
		]
	},
	{
		"id": "grafana-api-key",
		"description": "Identified a Grafana API key, which could compromise monitoring dashboards and sensitive data analytics.",
		"regex": {
			"source": "\\b(eyJrIjoi[A-Za-z0-9]{70,400}={0,3})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"eyjrijoi"
		]
	},
	{
		"id": "grafana-cloud-api-token",
		"description": "Found a Grafana cloud API token, risking unauthorized access to cloud-based monitoring services and data exposure.",
		"regex": {
			"source": "\\b(glc_[A-Za-z0-9+/]{32,400}={0,3})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"glc_"
		]
	},
	{
		"id": "grafana-service-account-token",
		"description": "Discovered a Grafana service account token, posing a risk of compromised monitoring services and data integrity.",
		"regex": {
			"source": "\\b(glsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"glsa_"
		]
	},
	{
		"id": "harness-api-key",
		"description": "Identified a Harness Access Token (PAT or SAT), risking unauthorized access to a Harness account.",
		"regex": {
			"source": "(?:pat|sat)\\.[a-zA-Z0-9_-]{22}\\.[a-zA-Z0-9]{24}\\.[a-zA-Z0-9]{20}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pat.",
			"sat."
		]
	},
	{
		"id": "hashicorp-tf-api-token",
		"description": "Uncovered a HashiCorp Terraform user/org API token, which may lead to unauthorized infrastructure management and security breaches.",
		"regex": {
			"source": "[a-z0-9]{14}\\.(?:atlasv1)\\.[a-z0-9\\-_=]{60,70}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"atlasv1"
		]
	},
	{
		"id": "hashicorp-tf-password",
		"description": "Identified a HashiCorp Terraform password field, risking unauthorized infrastructure configuration and security breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:administrator_login_password|password)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(\"[a-z0-9=_\\-]{8,20}\")(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": {
			"source": "\\.(?:tf|hcl)$",
			"flags": "gi"
		},
		"keywords": [
			"administrator_login_password",
			"password"
		]
	},
	{
		"id": "heroku-api-key",
		"description": "Detected a Heroku API Key, potentially compromising cloud application deployments and operational security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:heroku)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"heroku"
		]
	},
	{
		"id": "heroku-api-key-v2",
		"description": "Detected a Heroku API Key, potentially compromising cloud application deployments and operational security.",
		"regex": {
			"source": "\\b((HRKU-AA[0-9a-zA-Z_-]{58}))(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"hrku-aa"
		]
	},
	{
		"id": "hubspot-api-key",
		"description": "Found a HubSpot API Token, posing a risk to CRM data integrity and unauthorized marketing operations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:hubspot)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"hubspot"
		]
	},
	{
		"id": "huggingface-access-token",
		"description": "Discovered a Hugging Face Access token, which could lead to unauthorized access to AI models and sensitive data.",
		"regex": {
			"source": "\\b(hf_(?:[a-z]{34}))(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"hf_"
		]
	},
	{
		"id": "huggingface-organization-api-token",
		"description": "Uncovered a Hugging Face Organization API token, potentially compromising AI organization accounts and associated data.",
		"regex": {
			"source": "\\b(api_org_(?:[a-z]{34}))(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"api_org_"
		]
	},
	{
		"id": "infracost-api-token",
		"description": "Detected an Infracost API Token, risking unauthorized access to cloud cost estimation tools and financial data.",
		"regex": {
			"source": "\\b(ico-[a-zA-Z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ico-"
		]
	},
	{
		"id": "intercom-api-key",
		"description": "Identified an Intercom API Token, which could compromise customer communication channels and data privacy.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:intercom)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{60})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"intercom"
		]
	},
	{
		"id": "intra42-client-secret",
		"description": "Found a Intra42 client secret, which could lead to unauthorized access to the 42School API and sensitive data.",
		"regex": {
			"source": "\\b(s-s4t2(?:ud|af)-[abcdef0123456789]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"intra",
			"s-s4t2ud-",
			"s-s4t2af-"
		]
	},
	{
		"id": "jfrog-api-key",
		"description": "Found a JFrog API Key, posing a risk of unauthorized access to software artifact repositories and build pipelines.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:jfrog|artifactory|bintray|xray)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{73})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"jfrog",
			"artifactory",
			"bintray",
			"xray"
		]
	},
	{
		"id": "jfrog-identity-token",
		"description": "Discovered a JFrog Identity Token, potentially compromising access to JFrog services and sensitive software artifacts.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:jfrog|artifactory|bintray|xray)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"jfrog",
			"artifactory",
			"bintray",
			"xray"
		]
	},
	{
		"id": "jwt",
		"description": "Uncovered a JSON Web Token, which may lead to unauthorized access to web applications and sensitive user data.",
		"regex": {
			"source": "\\b(ey[a-zA-Z0-9]{17,}\\.ey[a-zA-Z0-9\\/\\\\_-]{17,}\\.(?:[a-zA-Z0-9\\/\\\\_-]{10,}={0,2})?)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ey"
		]
	},
	{
		"id": "kraken-access-token",
		"description": "Identified a Kraken Access Token, potentially compromising cryptocurrency trading accounts and financial security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:kraken)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9\\/=_\\+\\-]{80,90})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"kraken"
		]
	},
	{
		"id": "kubernetes-secret-yaml",
		"description": "Possible Kubernetes Secret detected, posing a risk of leaking credentials/tokens from your deployments",
		"regex": {
			"source": "(?:\\bkind:[ \\t]*[\"']?\\bsecret\\b[\"']?(?s:.){0,200}?\\bdata:(?s:.){0,100}?\\s+([\\w.-]+:(?:[ \\t]*(?:\\||>[-+]?)\\s+)?[ \\t]*(?:[\"']?[a-z0-9+/]{10,}={0,3}[\"']?|\\{\\{[ \\t\\w\"|$:=,.-]+}}|\"\"|''))|\\bdata:(?s:.){0,100}?\\s+([\\w.-]+:(?:[ \\t]*(?:\\||>[-+]?)\\s+)?[ \\t]*(?:[\"']?[a-z0-9+/]{10,}={0,3}[\"']?|\\{\\{[ \\t\\w\"|$:=,.-]+}}|\"\"|''))(?s:.){0,200}?\\bkind:[ \\t]*[\"']?\\bsecret\\b[\"']?)",
			"flags": "gi"
		},
		"path": {
			"source": "\\.ya?ml$",
			"flags": "gi"
		},
		"keywords": [
			"secret"
		]
	},
	{
		"id": "kucoin-access-token",
		"description": "Found a Kucoin Access Token, risking unauthorized access to cryptocurrency exchange services and transactions.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:kucoin)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{24})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"kucoin"
		]
	},
	{
		"id": "kucoin-secret-key",
		"description": "Discovered a Kucoin Secret Key, which could lead to compromised cryptocurrency operations and financial data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:kucoin)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"kucoin"
		]
	},
	{
		"id": "launchdarkly-access-token",
		"description": "Uncovered a Launchdarkly Access Token, potentially compromising feature flag management and application functionality.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:launchdarkly)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"launchdarkly"
		]
	},
	{
		"id": "linear-api-key",
		"description": "Detected a Linear API Token, posing a risk to project management tools and sensitive task data.",
		"regex": {
			"source": "lin_api_[a-z0-9]{40}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"lin_api_"
		]
	},
	{
		"id": "linear-client-secret",
		"description": "Identified a Linear Client Secret, which may compromise secure integrations and sensitive project management data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:linear)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"linear"
		]
	},
	{
		"id": "linkedin-client-id",
		"description": "Found a LinkedIn Client ID, risking unauthorized access to LinkedIn integrations and professional data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:linked[_-]?in)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{14})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"linkedin",
			"linked_in",
			"linked-in"
		]
	},
	{
		"id": "linkedin-client-secret",
		"description": "Discovered a LinkedIn Client secret, potentially compromising LinkedIn application integrations and user data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:linked[_-]?in)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"linkedin",
			"linked_in",
			"linked-in"
		]
	},
	{
		"id": "lob-api-key",
		"description": "Uncovered a Lob API Key, which could lead to unauthorized access to mailing and address verification services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:lob)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}((live|test)_[a-f0-9]{35})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"test_",
			"live_"
		]
	},
	{
		"id": "lob-pub-api-key",
		"description": "Detected a Lob Publishable API Key, posing a risk of exposing mail and print service integrations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:lob)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}((test|live)_pub_[a-f0-9]{31})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"test_pub",
			"live_pub",
			"_pub"
		]
	},
	{
		"id": "looker-client-id",
		"description": "Found a Looker Client ID, risking unauthorized access to a Looker account and exposing sensitive data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:looker)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{20})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"looker"
		]
	},
	{
		"id": "looker-client-secret",
		"description": "Found a Looker Client Secret, risking unauthorized access to a Looker account and exposing sensitive data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:looker)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{24})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"looker"
		]
	},
	{
		"id": "mailchimp-api-key",
		"description": "Identified a Mailchimp API key, potentially compromising email marketing campaigns and subscriber data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:MailchimpSDK.initialize|mailchimp)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{32}-us\\d\\d)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mailchimp"
		]
	},
	{
		"id": "mailgun-private-api-token",
		"description": "Found a Mailgun private API token, risking unauthorized email service operations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mailgun)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(key-[a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mailgun"
		]
	},
	{
		"id": "mailgun-pub-key",
		"description": "Discovered a Mailgun public validation key, which could expose email verification processes and associated data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mailgun)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(pubkey-[a-f0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mailgun"
		]
	},
	{
		"id": "mailgun-signing-key",
		"description": "Uncovered a Mailgun webhook signing key, potentially compromising email automation and data integrity.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mailgun)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-h0-9]{32}-[a-h0-9]{8}-[a-h0-9]{8})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mailgun"
		]
	},
	{
		"id": "mapbox-api-token",
		"description": "Detected a MapBox API token, posing a risk to geospatial services and sensitive location data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mapbox)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(pk\\.[a-z0-9]{60}\\.[a-z0-9]{22})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mapbox"
		]
	},
	{
		"id": "mattermost-access-token",
		"description": "Identified a Mattermost Access Token, which may compromise team communication channels and data privacy.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mattermost)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{26})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mattermost"
		]
	},
	{
		"id": "maxmind-license-key",
		"description": "Discovered a potential MaxMind license key.",
		"regex": {
			"source": "\\b([A-Za-z0-9]{6}_[A-Za-z0-9]{29}_mmk)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"_mmk"
		]
	},
	{
		"id": "messagebird-api-token",
		"description": "Found a MessageBird API token, risking unauthorized access to communication platforms and message data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:message[_-]?bird)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{25})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"messagebird",
			"message-bird",
			"message_bird"
		]
	},
	{
		"id": "messagebird-client-id",
		"description": "Discovered a MessageBird client ID, potentially compromising API integrations and sensitive communication data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:message[_-]?bird)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"messagebird",
			"message-bird",
			"message_bird"
		]
	},
	{
		"id": "microsoft-teams-webhook",
		"description": "Uncovered a Microsoft Teams Webhook, which could lead to unauthorized access to team collaboration tools and data leaks.",
		"regex": {
			"source": "https://[a-z0-9]+\\.webhook\\.office\\.com/webhookb2/[a-z0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12}@[a-z0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12}/IncomingWebhook/[a-z0-9]{32}/[a-z0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"webhook.office.com",
			"webhookb2",
			"incomingwebhook"
		]
	},
	{
		"id": "netlify-access-token",
		"description": "Detected a Netlify Access Token, potentially compromising web hosting services and site management.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:netlify)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{40,46})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"netlify"
		]
	},
	{
		"id": "new-relic-browser-api-token",
		"description": "Identified a New Relic ingest browser API token, risking unauthorized access to application performance data and analytics.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:new-relic|newrelic|new_relic)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(NRJS-[a-f0-9]{19})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"nrjs-"
		]
	},
	{
		"id": "new-relic-insert-key",
		"description": "Discovered a New Relic insight insert key, compromising data injection into the platform.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:new-relic|newrelic|new_relic)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(NRII-[a-z0-9-]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"nrii-"
		]
	},
	{
		"id": "new-relic-user-api-id",
		"description": "Found a New Relic user API ID, posing a risk to application monitoring services and data integrity.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:new-relic|newrelic|new_relic)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"new-relic",
			"newrelic",
			"new_relic"
		]
	},
	{
		"id": "new-relic-user-api-key",
		"description": "Discovered a New Relic user API Key, which could lead to compromised application insights and performance monitoring.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:new-relic|newrelic|new_relic)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(NRAK-[a-z0-9]{27})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"nrak"
		]
	},
	{
		"id": "notion-api-token",
		"description": "Notion API token",
		"regex": {
			"source": "\\b(ntn_[0-9]{11}[A-Za-z0-9]{32}[A-Za-z0-9]{3})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"ntn_"
		]
	},
	{
		"id": "npm-access-token",
		"description": "Uncovered an npm access token, potentially compromising package management and code repository access.",
		"regex": {
			"source": "\\b(npm_[a-z0-9]{36})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"npm_"
		]
	},
	{
		"id": "nuget-config-password",
		"description": "Identified a password within a Nuget config file, potentially compromising package management access.",
		"regex": {
			"source": "<add key=\\\"(?:(?:ClearText)?Password)\\\"\\s*value=\\\"(.{8,})\\\"\\s*/>",
			"flags": "gi"
		},
		"path": {
			"source": "nuget\\.config$",
			"flags": "gi"
		},
		"keywords": [
			"<add key="
		]
	},
	{
		"id": "nytimes-access-token",
		"description": "Detected a Nytimes Access Token, risking unauthorized access to New York Times APIs and content services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:nytimes|new-york-times,|newyorktimes)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9=_\\-]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"nytimes",
			"new-york-times",
			"newyorktimes"
		]
	},
	{
		"id": "oal-apple-app-specific-password",
		"description": "Detected an Apple app-specific password in developer tooling context.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:apple|fastlane|application[\\s_-]?specific)(?:[ \\t\\w.-]{0,30})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"apple",
			"fastlane",
			"application"
		]
	},
	{
		"id": "oal-apple-app-store-connect-authkey",
		"description": "Detected an App Store Connect AuthKey .p8 private key reference.",
		"regex": {
			"source": "\\b(AuthKey_[A-Z0-9]{10}\\.p8)\\b",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"AuthKey_"
		]
	},
	{
		"id": "oal-apple-app-store-connect-issuer",
		"description": "Detected App Store Connect issuer or key identifiers in Apple Developer automation context.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:app[\\s_-]?store[\\s_-]?connect|asc|apple)(?:[ \\t\\w.-]{0,40})(?:issuer[_-]?id|key[_-]?id)[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f-]{36}|[A-Z0-9]{10})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"appstore",
			"app_store",
			"app-store",
			"asc",
			"apple"
		]
	},
	{
		"id": "oal-database-url-credentials",
		"description": "Detected database connection URL credentials absent from upstream Gitleaks coverage.",
		"regex": {
			"source": "\\b((?:postgres(?:ql)?|redis):\\/\\/[^\\s:@]+:[^\\s@]+@[^\\s]+)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"postgres",
			"postgresql",
			"redis"
		]
	},
	{
		"id": "oal-mistral-api-key",
		"description": "Detected a Mistral API key assignment.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:mistral|MISTRAL_API_KEY)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([A-Za-z0-9]{32,})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"mistral",
			"MISTRAL_API_KEY"
		]
	},
	{
		"id": "oal-openrouter-api-key",
		"description": "Detected an OpenRouter API key.",
		"regex": {
			"source": "\\b(sk-or-v1-[A-Za-z0-9_\\-]{20,})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sk-or-v1"
		]
	},
	{
		"id": "oal-sensitive-dev-file",
		"description": "Detected a sensitive developer credential file path.",
		"regex": "",
		"path": {
			"source": "(?:^|/)(?:\\.env(?:\\.[^/\\s]+)?|\\.npmrc|\\.pypirc|\\.netrc|\\.dockercfg|\\.aws/(?:credentials|config)|\\.kube/config|kubeconfig(?:\\.[^/\\s]+)?|id_(?:rsa|dsa|ecdsa|ed25519)|service-account(?:-key)?\\.json|AuthKey_[A-Z0-9]{10}\\.p8)$|\\.(?:pem|key|p12|pfx|jks|keystore|mobileprovision|developerprofile)$",
			"flags": "g"
		},
		"keywords": []
	},
	{
		"id": "oal-xai-api-key",
		"description": "Detected an xAI API key.",
		"regex": {
			"source": "\\b(xai-[A-Za-z0-9_\\-]{20,})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xai-"
		]
	},
	{
		"id": "octopus-deploy-api-key",
		"description": "Discovered a potential Octopus Deploy API key, risking application deployments and operational security.",
		"regex": {
			"source": "\\b(API-[A-Z0-9]{26})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"api-"
		]
	},
	{
		"id": "okta-access-token",
		"description": "Identified an Okta Access Token, which may compromise identity management services and user authentication data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?i:[\\w.-]{0,50}?(?:(?:[Oo]kta|OKTA))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3})(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(00[\\w=\\-]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"okta"
		]
	},
	{
		"id": "openai-api-key",
		"description": "Found an OpenAI API Key, posing a risk of unauthorized access to AI services and data manipulation.",
		"regex": {
			"source": "\\b(sk-(?:proj|svcacct|admin)-(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})T3BlbkFJ(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})\\b|sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"t3blbkfj"
		]
	},
	{
		"id": "openshift-user-token",
		"description": "Found an OpenShift user token, potentially compromising an OpenShift/Kubernetes cluster.",
		"regex": {
			"source": "\\b(sha256~[\\w-]{43})(?:[^\\w-]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sha256~"
		]
	},
	{
		"id": "perplexity-api-key",
		"description": "Detected a Perplexity API key, which could lead to unauthorized access to Perplexity AI services and data exposure.",
		"regex": {
			"source": "\\b(pplx-[a-zA-Z0-9]{48})(?:[\\x60'\"\\s;]|\\\\[nr]|$|\\b)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pplx-"
		]
	},
	{
		"id": "pkcs12-file",
		"description": "Found a PKCS #12 file, which commonly contain bundled private keys.",
		"regex": "",
		"path": {
			"source": "(?:^|\\/)[^\\/]+\\.p(?:12|fx)$",
			"flags": "gi"
		},
		"keywords": []
	},
	{
		"id": "plaid-api-token",
		"description": "Discovered a Plaid API Token, potentially compromising financial data aggregation and banking services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:plaid)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(access-(?:sandbox|development|production)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"plaid"
		]
	},
	{
		"id": "plaid-client-id",
		"description": "Uncovered a Plaid Client ID, which could lead to unauthorized financial service integrations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:plaid)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{24})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"plaid"
		]
	},
	{
		"id": "plaid-secret-key",
		"description": "Detected a Plaid Secret key, risking unauthorized access to financial accounts and sensitive transaction data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:plaid)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{30})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"plaid"
		]
	},
	{
		"id": "planetscale-api-token",
		"description": "Identified a PlanetScale API token, potentially compromising database management and operations.",
		"regex": {
			"source": "\\b(pscale_tkn_[\\w=\\.-]{32,64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"pscale_tkn_"
		]
	},
	{
		"id": "planetscale-oauth-token",
		"description": "Found a PlanetScale OAuth token, posing a risk to database access control and sensitive data integrity.",
		"regex": {
			"source": "\\b(pscale_oauth_[\\w=\\.-]{32,64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pscale_oauth_"
		]
	},
	{
		"id": "planetscale-password",
		"description": "Discovered a PlanetScale password, which could lead to unauthorized database operations and data breaches.",
		"regex": {
			"source": "\\b(pscale_pw_[\\w=\\.-]{32,64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"pscale_pw_"
		]
	},
	{
		"id": "postman-api-token",
		"description": "Uncovered a Postman API token, potentially compromising API test-behavior and development workflows.",
		"regex": {
			"source": "\\b(PMAK-[a-f0-9]{24}\\-[a-f0-9]{34})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"pmak-"
		]
	},
	{
		"id": "prefect-api-token",
		"description": "Detected a Prefect API token, risking unauthorized access to workflow management and automation services.",
		"regex": {
			"source": "\\b(pnu_[a-zA-Z0-9]{36})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pnu_"
		]
	},
	{
		"id": "private-key",
		"description": "Identified a Private Key, which may compromise cryptographic security and sensitive data encryption.",
		"regex": {
			"source": "-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----[\\s\\S-]{64,}?KEY(?: BLOCK)?-----",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"-----begin"
		]
	},
	{
		"id": "privateai-api-token",
		"description": "Identified a PrivateAI Token, posing a risk of unauthorized access to AI services and data manipulation.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?i:[\\w.-]{0,50}?(?:private[_-]?ai)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3})(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{32})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"privateai",
			"private_ai",
			"private-ai"
		]
	},
	{
		"id": "pulumi-api-token",
		"description": "Found a Pulumi API token, posing a risk to infrastructure as code services and cloud resource management.",
		"regex": {
			"source": "\\b(pul-[a-f0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pul-"
		]
	},
	{
		"id": "pypi-upload-token",
		"description": "Discovered a PyPI upload token, potentially compromising Python package distribution and repository integrity.",
		"regex": {
			"source": "pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"pypi-ageichlwas5vcmc"
		]
	},
	{
		"id": "rapidapi-access-token",
		"description": "Uncovered a RapidAPI Access Token, which could lead to unauthorized access to various APIs and data services.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:rapidapi)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9_-]{50})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"rapidapi"
		]
	},
	{
		"id": "readme-api-token",
		"description": "Detected a Readme API token, risking unauthorized write-docs management and content exposure.",
		"regex": {
			"source": "\\b(rdme_[a-z0-9]{70})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"rdme_"
		]
	},
	{
		"id": "rubygems-api-token",
		"description": "Identified a Rubygem API token, potentially compromising Ruby library distribution and package management.",
		"regex": {
			"source": "\\b(rubygems_[a-f0-9]{48})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"rubygems_"
		]
	},
	{
		"id": "scalingo-api-token",
		"description": "Found a Scalingo API token, posing a risk to cloud platform services and application deployment security.",
		"regex": {
			"source": "\\b(tk-us-[\\w-]{48})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"tk-us-"
		]
	},
	{
		"id": "sendbird-access-id",
		"description": "Discovered a Sendbird Access ID, which could compromise chat and messaging platform integrations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:sendbird)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sendbird"
		]
	},
	{
		"id": "sendbird-access-token",
		"description": "Uncovered a Sendbird Access Token, potentially risking unauthorized access to communication services and user data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:sendbird)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sendbird"
		]
	},
	{
		"id": "sendgrid-api-token",
		"description": "Detected a SendGrid API token, posing a risk of unauthorized email service operations and data exposure.",
		"regex": {
			"source": "\\b(SG\\.[a-z0-9=_\\-\\.]{66})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sg."
		]
	},
	{
		"id": "sendinblue-api-token",
		"description": "Identified a Sendinblue API token, which may compromise email marketing services and subscriber data privacy.",
		"regex": {
			"source": "\\b(xkeysib-[a-f0-9]{64}\\-[a-z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"xkeysib-"
		]
	},
	{
		"id": "sentry-access-token",
		"description": "Found a Sentry.io Access Token (old format), risking unauthorized access to error tracking services and sensitive application data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:sentry)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sentry"
		]
	},
	{
		"id": "sentry-org-token",
		"description": "Found a Sentry.io Organization Token, risking unauthorized access to error tracking services and sensitive application data.",
		"regex": {
			"source": "\\bsntrys_eyJpYXQiO[a-zA-Z0-9+/]{10,200}(?:LCJyZWdpb25fdXJs|InJlZ2lvbl91cmwi|cmVnaW9uX3VybCI6)[a-zA-Z0-9+/]{10,200}={0,2}_[a-zA-Z0-9+/]{43}(?:[^a-zA-Z0-9+/]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sntrys_eyjpyxqio"
		]
	},
	{
		"id": "sentry-user-token",
		"description": "Found a Sentry.io User Token, risking unauthorized access to error tracking services and sensitive application data.",
		"regex": {
			"source": "\\b(sntryu_[a-f0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sntryu_"
		]
	},
	{
		"id": "settlemint-application-access-token",
		"description": "Found a Settlemint Application Access Token.",
		"regex": {
			"source": "\\b(sm_aat_[a-zA-Z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sm_aat"
		]
	},
	{
		"id": "settlemint-personal-access-token",
		"description": "Found a Settlemint Personal Access Token.",
		"regex": {
			"source": "\\b(sm_pat_[a-zA-Z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sm_pat"
		]
	},
	{
		"id": "settlemint-service-access-token",
		"description": "Found a Settlemint Service Access Token.",
		"regex": {
			"source": "\\b(sm_sat_[a-zA-Z0-9]{16})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sm_sat"
		]
	},
	{
		"id": "shippo-api-token",
		"description": "Discovered a Shippo API token, potentially compromising shipping services and customer order data.",
		"regex": {
			"source": "\\b(shippo_(?:live|test)_[a-fA-F0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"shippo_"
		]
	},
	{
		"id": "shopify-access-token",
		"description": "Uncovered a Shopify access token, which could lead to unauthorized e-commerce platform access and data breaches.",
		"regex": {
			"source": "shpat_[a-fA-F0-9]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"shpat_"
		]
	},
	{
		"id": "shopify-custom-access-token",
		"description": "Detected a Shopify custom access token, potentially compromising custom app integrations and e-commerce data security.",
		"regex": {
			"source": "shpca_[a-fA-F0-9]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"shpca_"
		]
	},
	{
		"id": "shopify-private-app-access-token",
		"description": "Identified a Shopify private app access token, risking unauthorized access to private app data and store operations.",
		"regex": {
			"source": "shppa_[a-fA-F0-9]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"shppa_"
		]
	},
	{
		"id": "shopify-shared-secret",
		"description": "Found a Shopify shared secret, posing a risk to application authentication and e-commerce platform security.",
		"regex": {
			"source": "shpss_[a-fA-F0-9]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"shpss_"
		]
	},
	{
		"id": "sidekiq-secret",
		"description": "Discovered a Sidekiq Secret, which could lead to compromised background job processing and application data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:BUNDLE_ENTERPRISE__CONTRIBSYS__COM|BUNDLE_GEMS__CONTRIBSYS__COM)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-f0-9]{8}:[a-f0-9]{8})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"bundle_enterprise__contribsys__com",
			"bundle_gems__contribsys__com"
		]
	},
	{
		"id": "sidekiq-sensitive-url",
		"description": "Uncovered a Sidekiq Sensitive URL, potentially exposing internal job queues and sensitive operation details.",
		"regex": {
			"source": "\\bhttps?://([a-f0-9]{8}:[a-f0-9]{8})@(?:gems.contribsys.com|enterprise.contribsys.com)(?:[\\/|\\#|\\?|:]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"gems.contribsys.com",
			"enterprise.contribsys.com"
		]
	},
	{
		"id": "slack-app-token",
		"description": "Detected a Slack App-level token, risking unauthorized access to Slack applications and workspace data.",
		"regex": {
			"source": "xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"xapp"
		]
	},
	{
		"id": "slack-bot-token",
		"description": "Identified a Slack Bot token, which may compromise bot integrations and communication channel security.",
		"regex": {
			"source": "xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xoxb"
		]
	},
	{
		"id": "slack-config-access-token",
		"description": "Found a Slack Configuration access token, posing a risk to workspace configuration and sensitive data access.",
		"regex": {
			"source": "xoxe.xox[bp]-\\d-[A-Z0-9]{163,166}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"xoxe.xoxb-",
			"xoxe.xoxp-"
		]
	},
	{
		"id": "slack-config-refresh-token",
		"description": "Discovered a Slack Configuration refresh token, potentially allowing prolonged unauthorized access to configuration settings.",
		"regex": {
			"source": "xoxe-\\d-[A-Z0-9]{146}",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"xoxe-"
		]
	},
	{
		"id": "slack-legacy-bot-token",
		"description": "Uncovered a Slack Legacy bot token, which could lead to compromised legacy bot operations and data exposure.",
		"regex": {
			"source": "xoxb-[0-9]{8,14}-[a-zA-Z0-9]{18,26}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xoxb"
		]
	},
	{
		"id": "slack-legacy-token",
		"description": "Detected a Slack Legacy token, risking unauthorized access to older Slack integrations and user data.",
		"regex": {
			"source": "xox[os]-\\d+-\\d+-\\d+-[a-fA-F\\d]+",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xoxo",
			"xoxs"
		]
	},
	{
		"id": "slack-legacy-workspace-token",
		"description": "Identified a Slack Legacy Workspace token, potentially compromising access to workspace data and legacy features.",
		"regex": {
			"source": "xox[ar]-(?:\\d-)?[0-9a-zA-Z]{8,48}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xoxa",
			"xoxr"
		]
	},
	{
		"id": "slack-user-token",
		"description": "Found a Slack User token, posing a risk of unauthorized user impersonation and data access within Slack workspaces.",
		"regex": {
			"source": "xox[pe](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"xoxp-",
			"xoxe-"
		]
	},
	{
		"id": "slack-webhook-url",
		"description": "Discovered a Slack Webhook, which could lead to unauthorized message posting and data leakage in Slack channels.",
		"regex": {
			"source": "(?:https?://)?hooks.slack.com/(?:services|workflows|triggers)/[A-Za-z0-9+/]{43,56}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"hooks.slack.com"
		]
	},
	{
		"id": "snyk-api-token",
		"description": "Uncovered a Snyk API token, potentially compromising software vulnerability scanning and code security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:snyk[_.-]?(?:(?:api|oauth)[_.-]?)?(?:key|token))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"snyk"
		]
	},
	{
		"id": "sonar-api-token",
		"description": "Uncovered a Sonar API token, potentially compromising software vulnerability scanning and code security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:sonar[_.-]?(login|token))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}((?:squ_|sqp_|sqa_)?[a-z0-9=_\\-]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sonar"
		]
	},
	{
		"id": "sourcegraph-access-token",
		"description": "Sourcegraph is a code search and navigation engine.",
		"regex": {
			"source": "\\b(\\b(sgp_(?:[a-fA-F0-9]{16}|local)_[a-fA-F0-9]{40}|sgp_[a-fA-F0-9]{40}|[a-fA-F0-9]{40})\\b)(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sgp_",
			"sourcegraph"
		]
	},
	{
		"id": "square-access-token",
		"description": "Detected a Square Access Token, risking unauthorized payment processing and financial transaction exposure.",
		"regex": {
			"source": "\\b((?:EAAA|sq0atp-)[\\w-]{22,60})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sq0atp-",
			"eaaa"
		]
	},
	{
		"id": "squarespace-access-token",
		"description": "Identified a Squarespace Access Token, which may compromise website management and content control on Squarespace.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:squarespace)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"squarespace"
		]
	},
	{
		"id": "stripe-access-token",
		"description": "Found a Stripe Access Token, posing a risk to payment processing services and sensitive financial data.",
		"regex": {
			"source": "\\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sk_test",
			"sk_live",
			"sk_prod",
			"rk_test",
			"rk_live",
			"rk_prod"
		]
	},
	{
		"id": "sumologic-access-id",
		"description": "Discovered a SumoLogic Access ID, potentially compromising log management services and data analytics integrity.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?i:[\\w.-]{0,50}?(?:(?:[Ss]umo|SUMO))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3})(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(su[a-zA-Z0-9]{12})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sumo"
		]
	},
	{
		"id": "sumologic-access-token",
		"description": "Uncovered a SumoLogic Access Token, which could lead to unauthorized access to log data and analytics insights.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:(?:[Ss]umo|SUMO))(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{64})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"sumo"
		]
	},
	{
		"id": "telegram-bot-api-token",
		"description": "Detected a Telegram Bot API Token, risking unauthorized bot operations and message interception on Telegram.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:telegr)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9]{5,16}:(?:A)[a-z0-9_\\-]{34})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"telegr"
		]
	},
	{
		"id": "travisci-access-token",
		"description": "Identified a Travis CI Access Token, potentially compromising continuous integration services and codebase security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:travis)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{22})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"travis"
		]
	},
	{
		"id": "twilio-api-key",
		"description": "Found a Twilio API Key, posing a risk to communication services and sensitive customer interaction data.",
		"regex": {
			"source": "SK[0-9a-fA-F]{32}",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"sk"
		]
	},
	{
		"id": "twitch-api-token",
		"description": "Discovered a Twitch API token, which could compromise streaming services and account integrations.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitch)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{30})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitch"
		]
	},
	{
		"id": "twitter-access-secret",
		"description": "Uncovered a Twitter Access Secret, potentially risking unauthorized Twitter integrations and data breaches.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{45})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitter"
		]
	},
	{
		"id": "twitter-access-token",
		"description": "Detected a Twitter Access Token, posing a risk of unauthorized account operations and social media data exposure.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([0-9]{15,25}-[a-zA-Z0-9]{20,40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitter"
		]
	},
	{
		"id": "twitter-api-key",
		"description": "Identified a Twitter API Key, which may compromise Twitter application integrations and user data security.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{25})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitter"
		]
	},
	{
		"id": "twitter-api-secret",
		"description": "Found a Twitter API Secret, risking the security of Twitter app integrations and sensitive data access.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{50})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitter"
		]
	},
	{
		"id": "twitter-bearer-token",
		"description": "Discovered a Twitter Bearer Token, potentially compromising API access and data retrieval from Twitter.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:twitter)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(A{22}[a-zA-Z0-9%]{80,100})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"twitter"
		]
	},
	{
		"id": "typeform-api-token",
		"description": "Uncovered a Typeform API token, which could lead to unauthorized survey management and data collection.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:typeform)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(tfp_[a-z0-9\\-_\\.=]{59})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"tfp_"
		]
	},
	{
		"id": "vault-batch-token",
		"description": "Detected a Vault Batch Token, risking unauthorized access to secret management services and sensitive data.",
		"regex": {
			"source": "\\b(hvb\\.[\\w-]{138,300})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "g"
		},
		"path": "",
		"keywords": [
			"hvb."
		]
	},
	{
		"id": "vault-service-token",
		"description": "Identified a Vault Service Token, potentially compromising infrastructure security and access to sensitive credentials.",
		"regex": {
			"source": "\\b((?:hvs\\.[\\w-]{90,120}|s\\.(?:[a-z0-9]{24})))(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"hvs.",
			"s."
		]
	},
	{
		"id": "yandex-access-token",
		"description": "Found a Yandex Access Token, posing a risk to Yandex service integrations and user data privacy.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:yandex)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(t1\\.[A-Z0-9a-z_-]+[=]{0,2}\\.[A-Z0-9a-z_-]{86}[=]{0,2})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"yandex"
		]
	},
	{
		"id": "yandex-api-key",
		"description": "Discovered a Yandex API Key, which could lead to unauthorized access to Yandex services and data manipulation.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:yandex)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(AQVN[A-Za-z0-9_\\-]{35,38})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"yandex"
		]
	},
	{
		"id": "yandex-aws-access-token",
		"description": "Uncovered a Yandex AWS Access Token, potentially compromising cloud resource access and data security on Yandex Cloud.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:yandex)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}(YC[a-zA-Z0-9_\\-]{38})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"yandex"
		]
	},
	{
		"id": "zendesk-secret-key",
		"description": "Detected a Zendesk Secret Key, risking unauthorized access to customer support services and sensitive ticketing data.",
		"regex": {
			"source": "[\\w.-]{0,50}?(?:zendesk)(?:[ \\t\\w.-]{0,20})[\\s'\"]{0,3}(?:=|>|:{1,3}=|\\|\\||:|=>|\\?=|,)[\\x60'\"\\s=]{0,5}([a-z0-9]{40})(?:[\\x60'\"\\s;]|\\\\[nr]|$)",
			"flags": "gi"
		},
		"path": "",
		"keywords": [
			"zendesk"
		]
	}
];

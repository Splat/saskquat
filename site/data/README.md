# Site Data
For the moment this is where the output of the CLI `main.go` stores the output of `results.json`. The site depends on this output to render filtering and sorting options to work with output.

## Data Model
Here is the presumed output of the CLI tool into results.json on which the site depends. This is updated as the script is updated. Please submit a pull request if anything changes and I miss it.
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": [],
    "properties": {
      "domain": {
        "type": "string"
      },
      "resolvable": {
        "type": "boolean"
      },
      "has_mail": {
        "type": "boolean"
      },
      "dns": {
        "type": "object",
        "required": [],
        "properties": {
          "HasA": {
            "type": "boolean"
          },
          "HasAAAA": {
            "type": "string"
          },
          "HasCNAME": {
            "type": "string"
          },
          "HasMX": {
            "type": "boolean"
          },
          "HasNS": {
            "type": "boolean"
          },
          "A": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "AAAA": {
            "type": "string"
          },
          "CNAME": {
            "type": "string"
          },
          "MX": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "NS": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "tls": {
        "type": "object",
        "required": [],
        "properties": {
          "Connected": {
            "type": "boolean"
          },
          "ServerName": {
            "type": "string"
          },
          "Issuer": {
            "type": "string"
          },
          "Subject": {
            "type": "string"
          },
          "NotBefore": {
            "type": "string"
          },
          "NotAfter": {
            "type": "string"
          },
          "DNSNames": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "CommonName": {
            "type": "string"
          },
          "SerialNumber": {
            "type": "string"
          }
        }
      },
      "http": {
        "type": "object",
        "required": [],
        "properties": {
          "Attempted": {
            "type": "boolean"
          },
          "URL": {
            "type": "string"
          },
          "Status": {
            "type": "string"
          },
          "StatusCode": {
            "type": "number"
          },
          "Location": {
            "type": "string"
          },
          "Server": {
            "type": "string"
          }
        }
      }
    }
  }
}
```
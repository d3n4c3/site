# Read the JSON file
$jsonFilePath = "quotes.JSON"
$jsonContent = Get-Content -Path $jsonFilePath -Raw | ConvertFrom-Json

# Remove the 'c' and 'h' properties from each quote
foreach ($quote in $jsonContent) {
    $quote.PSObject.Properties.Remove("c")
    $quote.PSObject.Properties.Remove("h")
}

# Convert the modified content back to JSON and save it to the file
$jsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonFilePath

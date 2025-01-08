# Define the URL to scrape quotes from
$url = "https://zenquotes.io/api/quotes"

# Define the number of quotes to fetch
$numQuotes = 500

# Initialize an empty array to store quotes
$quotesArray = @()

# Function to fetch quotes from the API
function Fetch-Quotes {
    param (
        [int]$count
    )
    $response = Invoke-RestMethod -Uri "$url"
    return $response
}

# Fetch quotes in batches to avoid duplicates
while ($quotesArray.Count -lt $numQuotes) {
    $remaining = $numQuotes - $quotesArray.Count
    $batchSize = [math]::Min($remaining, 50) # Fetch in batches of 50
    $quotesBatch = Fetch-Quotes -count $batchSize

    # Add unique quotes to the array
    foreach ($quote in $quotesBatch) {
        if (-not $quotesArray.Contains($quote)) {
            $quotesArray += $quote
        }
    }
}

# Convert the quotes array to JSON
$jsonQuotes = $quotesArray | ConvertTo-Json -Depth 3

# Save the JSON to a file
$outputFile = "quotes.json"
$jsonQuotes | Out-File -FilePath $outputFile -Encoding UTF8

Write-Output "Quotes saved to $outputFile"

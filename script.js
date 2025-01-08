document.addEventListener('DOMContentLoaded', function () {
    const quoteText = document.getElementById('quote');
    const quoteAuthor = document.getElementById('author');
    const newQuoteBtn = document.getElementById('new-quote');

    let quotes = [];

    // Fetch quotes from the JSON file
    fetch('quotes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            quotes = data;
            displayNewQuote();
        })
        .catch(error => console.error('Error fetching quotes:', error));

    // Display a new quote
    function displayNewQuote() {
        if (quotes.length === 0) {
            quoteText.textContent = 'No quotes available';
            quoteAuthor.textContent = '';
            return;
        }
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const quote = quotes[randomIndex];
        quoteText.textContent = quote.q;
        quoteAuthor.textContent = `— ${quote.a}`;
    }

    // Add event listener to the button
    newQuoteBtn.addEventListener('click', displayNewQuote);
});

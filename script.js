document.addEventListener("DOMContentLoaded", function () {
    function getRandomQuote(quotes) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    }

    function displayQuote(quotes) {
        const quote = getRandomQuote(quotes);
        document.getElementById("quote").textContent = quote.q;
        document.getElementById("author").textContent = `— ${quote.a}`;
    }

    fetch('quotes.json')
        .then(response => response.json())
        .then(data => {
            displayQuote(data);
            document.getElementById("new-quote").addEventListener("click", () => displayQuote(data));
        })
        .catch(error => console.error('Error fetching quotes:', error));
});

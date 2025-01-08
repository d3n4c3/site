document.addEventListener("DOMContentLoaded", function () {
    console.log("Script loaded"); // Debugging line

    function getRandomQuote(quotes) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    }

    function displayQuote(quotes) {
        const quote = getRandomQuote(quotes);
        console.log("Selected Quote:", quote); // Debugging line
        document.getElementById("quote").textContent = quote.q;
        document.getElementById("author").textContent = `— ${quote.a}`;
    }

    fetch('quotes.json')
        .then(response => {
            console.log("Fetch response:", response); // Debugging line
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Fetched Data:", data); // Debugging line
            displayQuote(data);
            document.getElementById("new-quote").addEventListener("click", () => displayQuote(data));
        })
        .catch(error => console.error('Error fetching quotes:', error));
});

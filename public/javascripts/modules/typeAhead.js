import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
    return stores
        .map(store => {
            return `
                <a href="/stores/${store.slug}" class="search__result">
                    <strong>${store.name}</strong>
                </a>
            `;
        })
        .join('');
}

function typeAhead(search) {
    if (!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    searchInput.on('input', function () {
        if (!this.value) {
            searchResults.style.display = 'none';
            return;
        }

        searchResults.style.display = "block";
        searchResults.innerHTML = '';

        axios
            .get(`/api/search?q=${this.value}`)
            .then(({ data }) => {
                if (data.length) {
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(data));
                    return;
                }
                searchResults.innerHTML = dompurify.sanitiaze(`<div class="search__result">There is no <strong>${this.value}</strong> found!</div>`);
            })
            .catch(err => {
                console.error(err);
            });
    });

    searchInput.on('keyup', event => {
        if (![13, 38, 40].includes(event.keyCode)) return;
        const activeClass = 'search__result--active';
        const items = searchResults.querySelectorAll('.search__result');
        const current = searchResults.querySelector(`.${activeClass}`);
        let next;
        if (event.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        } else if (event.keyCode === 40) {
            next = items[0];
        } else if (event.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1];
        } else if (event.keyCode === 38) {
            next = items[items.length - 1];
        } else if (event.keyCode === 13 && current) {
            console.log('Changing Pages!');
            console.log(current.href);
            window.location = current.href;
            return;
        }
        next.classList.add(activeClass);
        if (current) {
            current.classList.remove(activeClass);
        }
    });
}

export default typeAhead;
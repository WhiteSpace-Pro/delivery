// Wait! `isLoading` might never become false if `useUser` is broken!
// Did I break `useUser`?
// Look at `apollo-pizzaria/hooks/useUser.ts`.
// I did not change `useUser.ts` in A2.7.
// Let's check `useUser.ts` again.
const fs = require('fs');
const path = './apollo-pizzaria/hooks/useUser.ts';
let content = fs.readFileSync(path, 'utf8');
console.log(content.match(/setIsLoading\(false\)/g));

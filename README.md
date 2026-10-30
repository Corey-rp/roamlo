# RoamLo

A travel budget class website with a login and registration system (Node.js, Express and MySQL).

## Run it locally

1. **Create the database.** Open MySQL Workbench (or the `mysql` command line) and run `setup.sql`. It creates the `roamlo` database and the `users` table.
2. **Set your MySQL root password** in PowerShell, in the same window you will start the server from:
   ```powershell
   $env:ROOTPASS = "yourpassword"
   ```
3. **Install the packages:**
   ```powershell
   npm install
   ```
4. **Start the server:**
   ```powershell
   npm start
   ```
5. Open http://localhost:3000/register.html to make an account, then log in at http://localhost:3000/login.html.

If MySQL is not running when the server starts, the pages still load but register and login show an error page. Start MySQL, then restart the server with `npm start`.

## Files

- `server.js` handles `/register` and `/login`.
- `setup.sql` creates the database table.
- `public/` holds the website (HTML, CSS, JavaScript and images).

Photo on the login and register pages by [paws and prints](https://unsplash.com/@paws_and_prints) on [Unsplash](https://unsplash.com/photos/turquoise-ocean-meets-a-lush-green-coastline-with-sandy-beaches-8_nE3qRtNGc).

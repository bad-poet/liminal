import express from "express";
import fs from 'fs';
import sqlite3 from 'sqlite3';

const app = express();
const port: number = 3000;

let db = new sqlite3.Database('db.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        db = new sqlite3.Database('db.db')
        db.exec(fs.readFileSync('schema.sql').toString())
    }
});

class User {
    id: number;
    username: string;
    password: string;
    pfp: string;
}

class Liminal {
    id: number;
    author: number;
    name: string;
    video: string;
    audio: string;
    description: string;
}

class Following {
    maker: number;
    user: number;
}

class Maker {
    id: number;
    verified: boolean;
    user: number;
}


app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
)

app.post('/signup', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    db.exec(`INSERT INTO Users (username, password, pfp) VALUES ("${username}", "${password}", "")`)
    res.sendStatus(201);
})

app.post('/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    db.all<User>(`SELECT * FROM Users WHERE username = "${username}"`, [], (error, rows) => {
        for (let row of rows) {
            if (row.password == password) {
                return res.send('Ok!');
            }
        }
        res.send('Account not found.')
    })
})

app.get('/followers', (req, res) => {
    let user = req.body.user;

    db.all(`SELECT * FROM Followers WHERE maker = "${user}"`, [], (error, rows) => {
        res.send(rows.length);
    })
})

app.get('/following', (req, res) => {
    let user = req.body.user;

    db.all<Following>(`SELECT * FROM Followings WHERE user = "${user}"`, [], (error, rows) => {
        let following: Maker[] = []
        for (let row of rows) {
            db.all<Maker>(`SELECT * FROM Makers WHERE id = ${row.maker}`, [], (error, makers) => {
                following.push(makers[0])
            })
        }
        res.send(following)
    })
})

app.post('/following', (req, res) => {
    let user = req.body.user;
    let maker = req.body.maker;

    db.exec(`INSERT INTO Followings (user, maker) VALUES (${user}, ${maker})`, (err) => {
        if (err) {
            console.log(err)
            return res.sendStatus(500)
        }
        res.sendStatus(201);
    })
})

app.get('/liminals', (req, res) => {
    db.all<Liminal>(`SELECT * FROM Content`, [], (error, rows) => {
        res.send(rows)
    })
})

app.get('/liminals/:id', (req, res) => {
    db.all<Liminal>(`SELECT * FROM Content WHERE id = "${req.params.id}"`, [], (error, rows) => {
        res.send(rows[0])
    })
})

app.post('/liminals', (req, res) => {
    let name = req.body.name;
    let video = req.body.video;
    let audio = req.body.audio;
    let description = req.body.description;
    let author = req.body.author;

    db.exec(`INSERT INTO Content (author, name, video, audio, description) VALUES (${author}, "${name}", "${video}", "${audio}", "${description}")`, (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        res.sendStatus(201);
    });
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}\n Link: http://localhost:${port}`)
})

// Shutdown the database
process.on('SIGTERM', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
    })
})
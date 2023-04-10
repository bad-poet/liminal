import * as mysql from 'mysql';

import express from "express";
import fs from 'fs';
import sqlite3 from 'sqlite3';

const app = express();
const port = 3000;

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
    video_id: number;
    audio_id: number;
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

class Comment {
    id: number;
    author: number;
    sub: number;
    content: string;
}

class Replies {
    id: number;
    author: number;
    comment: number;
    content: string;
}

class Blog {
    id: number;
    title: string;
    content: string;
    user: number;
}

class BlogImage {
    blog: number;
    loc: string;
}

class Friendship {
    id: number;
    user1: number;
    user2: number;
    accepted: boolean;
}


app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
)

app.post('/signup', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    let statement = mysql.format('INSERT INTO Users (username, password, pfp) VALUES ("?", "?", "")', [username,password]);

    db.exec(statement)
    res.sendStatus(201);
})

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    let statement = mysql.format('SELECT * FROM Users WHERE username = "?"', [username])

    db.all<User>(statement, [], (error, rows) => {
        for (const row of rows) {
            if (row.password == password) {
                return res.send('Ok!');
            }
        }
        res.send('Account not found.')
    })
})

app.get('/followers', (req, res) => {
    const user = req.body.user;

    let statement = mysql.format('SELECT * FROM Followers WHERE maker = "?"', [user])

    db.all(statement, [], (error, rows) => {
        res.send(rows.length);
    })
})

app.get('/following', (req, res) => {
    const user = req.body.user;

    let statement = mysql.format('SELECT * FROM Followings WHERE user = "?"', [user]);

    db.all<Following>(statement, [], (error, rows) => {
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

    let statement = mysql.format('INSERT INTO Followings (user, maker) VALUES (?, ?)', [user, maker])

    db.exec(statement, (err) => {
        if (err) {
            console.log(err)
            return res.sendStatus(500)
        }
        res.sendStatus(201);
    })
})

app.get('/friends', (req, res) => {
    let user = req.body.user;

    let statement = mysql.format("SELECT * FROM Friends WHERE user = ?", [user]);

    db.all<Friendship>(statement, (err, rows) => {
        let friends: {friend: number, user: User}[]

        for (let row of rows) {
            db.all<User>(`SELECT * FROM Users WHERE id = ${row.user2}`, (err, users) => {
                friends.push({friend: row.id, user: users[0]})
            })
        }
        res.send(friends)
    })
})

app.post('/friends', (req, res) => {
    let user1 = req.body.user1;
    let user2 = req.body.user2;

    let statement = mysql.format("INSERT INTO Friends (user1, user2, accepted) VALUES (?, ?, false)", [user1, user2])

    db.exec(statement, (err) => {
        if (err) {
            console.log(err)
            return res.sendStatus(500)
        }
        res.sendStatus(201);
    })
})

app.post('/accept', (req, res) => {
    let id = req.body.id;

    let statement = mysql.format("UPDATE Friends SET accepted = true WHERE id = ?", [id])

    db.exec(statement, (err) => {
        if (err) {
            console.log(err)
            return res.sendStatus(500)
        }
        res.sendStatus(200);
    })
})

app.get('/comments', (req, res) => {
    db.all<Comment>(`SELECT * FROM Comments`, [], (error, rows) => {
        res.send(rows)
    })
})

app.post('/comments', (req, res) => {
    let author = req.body.author;
    let sub = req.body.sub;
    let content = req.body.content;

    let statement = mysql.format(`INSERT INTO Comments (author, sub, content) VALUES (?, ?, ?)`, [author, sub, content])

    db.exec(statement, (err) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
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

    let statement = mysql.format(`SELECT * FROM Content WHERE id = ?`, [req.params.id])

    db.all<Liminal>(statement, [], (error, rows) => {
        res.send(rows[0])
    })
})

app.post('/liminals', (req, res) => {
    let name = req.body.name;
    let video = req.body.video;
    let audio = req.body.audio;
    let description = req.body.description;
    let author = req.body.author;

    let statement = mysql.format(`INSERT INTO Content (author, name, video, audio, description) VALUES (?, ?, ?, ?, ?)`, [author, name, video, audio, description])

    db.exec(statement, (err) => {
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
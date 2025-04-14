const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

// Порт, на котором будет работать сервер
const PORT = process.env.PORT || 3000;

// База данных для хранения пользователей и их покупок
const database = {
    users: [
        { email: 'admin@example.com', password: 'admin', name: 'Админ' }
    ],
    purchasedBooks: {},
    books: [
        { 
            id: 1,
            title: "Махаббат, қызық мол жылдар", 
            author: "Әзілхан Нұршайықов", 
            genre: "Романтика", 
            description: "Махаббат, қызық мол жылдар — Әзілхан Нұршайықовтың қазақ әдебиетінің классикасына айналған туындысы. Бұл роман 1967 жылы алғаш рет жарық көріп, қазақ жастарының сүйікті кітабына айналды. Романның басты кейіпкерлері — студенттер мен жас адамдардың махаббат, достық, өмірдің түрлі қиындықтарын жеңіп шығу жолындағы күресі. Жазушы жастардың ішкі сезімдерін, олардың адамгершілік, адалдық, махаббат туралы түсініктерін терең әрі шынайы суреттейді.",
            link: "http://dev-s.balatili.kz/uploads/books/e3c0b8aca955a2e22aa53f053550270c/%D0%9C%D0%B0%D1%85%D0%B0%D0%B1%D0%B1%D0%B0%D1%82%20%D2%9B%D1%8B%D0%B7%D1%8B%D2%9B%20%D0%BC%D0%BE%D0%BB%20%D0%B6%D1%8B%D0%BB%D0%B4%D0%B0%D1%80.pdf", 
            image: "https://simg.marwin.kz/media/catalog/product/cache/41deb699a7fea062a8915debbbb0442c/m/a/nrshayyov_mahabbat_yzy_mol_jyldar.jpg",
            isPaid: true,
            price: 1200
        },
        { 
            id: 2,
            title: "Абай Жолы", 
            author: "Мұхтар Әуезов", 
            genre: "Классика", 
            description: "Абай жолы — қазақ әдебиетінің ұлы шығармаларының бірі, қазақ халқының классикалық әдебиетінің символы және қазақтың ұлы ақыны, ойшылы Абай Құнанбайұлының өмірі мен шығармашылығына арналған роман-эпопея. Абай жолы — төрт томнан тұратын күрделі эпопея, алғаш рет 1942 жылы жарияланған. Мұхтар Әуезов осы шығармасында Абайдың жеке өмірін, оның дүниетанымын, шығармашылығын, қазақ қоғамындағы өзгерістерді және сол кезеңдегі тарихи оқиғаларды терең бейнелейді.",
            link: "https://predmet.kz/adebiet/%D0%BA%D1%96%D1%82%D0%B0%D0%BF%D1%82%D0%B0%D1%80/%D0%90%D0%B1%D0%B0%D0%B9%20%D0%B6%D0%BE%D0%BB%D1%8B.1%20%D0%BA%D1%96%D1%82%D0%B0%D0%BF.pdf", 
            image: "https://s.f.kz/prod/1540/1539578_1000.jpg",
            isPaid: false,
            price: 0
        },
        { 
            id: 3,
            title: "Қан мен Тер", 
            author: "Әбдіжәміл Нұрпейісов", 
            genre: "Классика", 
            description: "Қан мен тер — қазақ әдебиетінің көрнекті шығармаларының бірі, жазушы Әбдіжәміл Нұрпейісовтің ең танымал туындысы. Роман алғаш рет 1970 жылы жарияланған және қазақ әдебиетінің классикалық туындыларының қатарына кіреді. Шығарма өзінің терең әлеуметтік және психологиялық мазмұнымен ерекшеленеді, қазақ халқының қиын кезеңдері мен халықтық тағдырдың шынайы суретін көрсетеді.",
            link: "https://adebiportal.kz/upload/iblock/0d5/0d581f528880c6ae74bf3685d2ef0add.pdf", 
            image: "https://balkhash.goo.kz/files/blog/1674232545216.jpg",
            isPaid: true,
            price: 1500
        }
    ],
    activeSessions: {}
};

// Функция для сохранения базы данных в файл (в реальном проекте лучше использовать настоящую БД)
function saveDatabase() {
    fs.writeFileSync(path.join(__dirname, 'database.json'), JSON.stringify(database, null, 2));
    console.log('База данных сохранена');
}

// Функция для загрузки базы данных из файла при запуске сервера
function loadDatabase() {
    try {
        if (fs.existsSync(path.join(__dirname, 'database.json'))) {
            const data = fs.readFileSync(path.join(__dirname, 'database.json'), 'utf8');
            const loadedDB = JSON.parse(data);
            database.users = loadedDB.users || database.users;
            database.purchasedBooks = loadedDB.purchasedBooks || database.purchasedBooks;
            database.books = loadedDB.books || database.books;
            database.activeSessions = loadedDB.activeSessions || database.activeSessions;
            console.log('База данных загружена');
        } else {
            console.log('Файл базы данных не найден, используются значения по умолчанию');
            saveDatabase(); // Создаем файл с данными по умолчанию
        }
    } catch (error) {
        console.error('Ошибка при загрузке базы данных:', error);
    }
}

// Загружаем базу данных при запуске сервера
loadDatabase();

// Функция для обработки POST-запросов
async function handlePostRequest(req, res) {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    
    // Получаем тело запроса
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    return new Promise(resolve => {
        req.on('end', () => {
            // Обработка API-запросов
            if (pathname === '/api/register') {
                try {
                    const data = JSON.parse(body);
                    const { email, password, name } = data;
                    
                    // Проверяем, существует ли уже пользователь с таким email
                    const existingUser = database.users.find(user => user.email === email);
                    if (existingUser) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Пользователь с таким email уже существует' }));
                    } else {
                        // Добавляем нового пользователя
                        database.users.push({ email, password, name });
                        database.purchasedBooks[email] = []; // Инициализируем пустой массив купленных книг
                        
                        // Сохраняем изменения в базе данных
                        saveDatabase();
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Регистрация успешно завершена' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный формат данных' }));
                }
            } else if (pathname === '/api/login') {
                try {
                    const data = JSON.parse(body);
                    const { email, password } = data;
                    
                    // Ищем пользователя с указанными email и паролем
                    const user = database.users.find(user => user.email === email && user.password === password);
                    
                    if (user) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            message: 'Вход выполнен успешно',
                            user: { email: user.email, name: user.name }
                        }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Неверный email или пароль' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный формат данных' }));
                }
            } else if (pathname === '/api/purchase') {
                try {
                    const data = JSON.parse(body);
                    const { email, bookId, sessionId } = data;
                    
                    // Находим книгу по ID
                    const book = database.books.find(book => book.id === bookId);
                    
                    if (!book) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Книга не найдена' }));
                        resolve();
                        return;
                    }
                    
                    // Проверяем, существует ли пользователь
                    const user = database.users.find(user => user.email === email);
                    if (!user) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Пользователь не найден' }));
                        resolve();
                        return;
                    }
                    
                    // Если книга уже куплена, возвращаем success но сообщаем об этом
                    if (database.purchasedBooks[email] && database.purchasedBooks[email].includes(bookId)) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            message: 'Книга уже куплена',
                            alreadyPurchased: true
                        }));
                        resolve();
                        return;
                    }
                    
                    // Добавляем книгу в список купленных
                    if (!database.purchasedBooks[email]) {
                        database.purchasedBooks[email] = [];
                    }
                    database.purchasedBooks[email].push(bookId);
                    
                    // Сохраняем статус сессии как завершенный, если указан sessionId
                    if (sessionId) {
                        database.activeSessions[sessionId] = {
                            status: 'completed',
                            bookId: bookId,
                            email: email,
                            timestamp: new Date().toISOString()
                        };
                    }
                    
                    // Сохраняем изменения в базе данных
                    saveDatabase();
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Книга успешно куплена'
                    }));
                } catch (error) {
                    console.error('Ошибка при обработке покупки:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Ошибка сервера при обработке покупки' }));
                }
            } else if (pathname === '/api/payment-status') {
                try {
                    const data = JSON.parse(body);
                    const { sessionId } = data;
                    
                    // Проверяем статус сессии
                    const session = database.activeSessions[sessionId];
                    
                    if (session) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            status: session.status,
                            bookId: session.bookId
                        }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: false, 
                            message: 'Сессия не найдена'
                        }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный формат данных' }));
                }
            } else if (pathname === '/api/books') {
                // Возвращаем список всех книг
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    books: database.books
                }));
            } else if (pathname === '/api/user-books') {
                try {
                    const data = JSON.parse(body);
                    const { email } = data;
                    
                    // Проверяем, существует ли пользователь
                    const user = database.users.find(user => user.email === email);
                    if (!user) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Пользователь не найден' }));
                        resolve();
                        return;
                    }
                    
                    // Получаем список купленных книг пользователя
                    const userBookIds = database.purchasedBooks[email] || [];
                    const userBooks = database.books.filter(book => userBookIds.includes(book.id));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        books: userBooks
                    }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный формат данных' }));
                }
            } else {
                // Неизвестный POST-запрос
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'API endpoint не найден' }));
            }
            
            resolve();
        });
    });
}

// Создаем HTTP-сервер
const server = http.createServer(async (req, res) => {
    // Настройка CORS для обеспечения доступа к API с любого домена
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Обработка предварительных запросов CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Обработка POST-запросов
    if (req.method === 'POST') {
        await handlePostRequest(req, res);
        return;
    }
    
    // Для GET-запросов продолжаем обычную обработку файлов
    // Парсим URL запроса
    let parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Если запрошен корневой путь, отдаем index.html
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }
    
    // Определяем расширение файла
    const ext = path.parse(pathname).ext;
    
    // Полный путь к запрошенному файлу
    const filePath = path.join(__dirname, pathname);
    
    // Словарь MIME-типов для правильного Content-Type
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
        '.pdf': 'application/pdf'
    };
    
    // Проверяем существование файла
    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Если файл не найден, отправляем 404
            if (err.code === 'ENOENT') {
                // Проверяем, есть ли файл 404.html
                const notFoundPath = path.join(__dirname, '404.html');
                fs.readFile(notFoundPath, (notFoundErr, notFoundData) => {
                    if (notFoundErr) {
                        // Если нет файла 404.html, отправляем простой текстовый ответ
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(`
                            <h1>404 - Страница не найдена</h1>
                            <p>Запрошенная страница "${pathname}" не существует.</p>
                            <a href="/">Вернуться на главную</a>
                        `);
                    } else {
                        // Отправляем содержимое 404.html
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end(notFoundData);
                    }
                });
                return;
            }
            
            // Другие ошибки сервера
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
            return;
        }
        
        // Успешный ответ
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data, 'utf8');
    });
});

// Запускаем сервер
server.listen(PORT, () => {
    const localUrl = `http://localhost:${PORT}`;
    
    // Определяем URL для GitHub Codespace
    let publicUrl = localUrl;
    if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES) {
        publicUrl = `https://${process.env.CODESPACE_NAME}-${PORT}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    } else if (process.env.CODESPACE_NAME) {
        // Для более старых версий GitHub Codespaces
        publicUrl = `https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`;
    }
    
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Локальный URL: ${localUrl}`);
    console.log(`Публичный URL: ${publicUrl}`);
    console.log('Для остановки сервера нажмите Ctrl+C');
});

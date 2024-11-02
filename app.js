const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;

// Configuração de conexão com o banco de dados MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
    
};

// Função para conectar ao banco de dados
async function getConnection() {
    return mysql.createConnection(dbConfig);
}

function getTransacaoComIcone(transacao) {
    let icon;
    if (transacao.tipo === 'entrada') {
        icon = '<i class="fas fa-arrow-up"></i>';
    } else {
        icon = '<i class="fas fa-arrow-down"></i>';
    }
    return `${transacao.tipo} ${transacao.valor} ${transacao.data} ${icon} ${transacao.nome_do_item}`;
}

app.get('/', async (req, res) => {
    const query = `
        SELECT 
            SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada,
            SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida,
            (SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor ELSE 0 END) - 
             SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor ELSE 0 END)) AS saldo,
            SUM(CASE WHEN tipo = 'entrada' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_dia,
            SUM(CASE WHEN tipo = 'saida' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_dia,
            SUM(CASE WHEN tipo = 'entrada' AND WEEK(data) = WEEK(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_semana,
            SUM(CASE WHEN tipo = 'saida' AND WEEK(data) = WEEK(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_semana,
            SUM(CASE WHEN tipo = 'entrada' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_mes,
            SUM(CASE WHEN tipo = 'saida' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_mes
        FROM transacoes;
    `;

    const queryTransacoes = `
        SELECT
            id,
            tipo,
            forma_pagamento,
            valor,
            nome_do_item,
            descricao,
            DATE_FORMAT(data, '%Y-%m-%d') AS data
        FROM transacoes
        WHERE DATE(data) = CURDATE();
    `;

    try {
        const db = await getConnection();
        const [result] = await db.execute(query);
        const saldo = parseFloat(result[0].saldo) || 0;
        const total_entrada = parseFloat(result[0].total_entrada) || 0;
        const total_saida = parseFloat(result[0].total_saida) || 0;
        const total_entrada_dia = parseFloat(result[0].total_entrada_dia) || 0;
        const total_saida_dia = parseFloat(result[0].total_saida_dia) || 0;
        const total_entrada_semana = parseFloat(result[0].total_entrada_semana) || 0;
        const total_saida_semana = parseFloat(result[0].total_saida_semana) || 0;
        const total_entrada_mes = parseFloat(result[0].total_entrada_mes) || 0;
        const total_saida_mes = parseFloat(result[0].total_saida_mes) || 0;

        const [transacoes] = await db.execute(queryTransacoes);
        await db.end();
        res.render('index', {
            saldo,
            total_entrada,
            total_saida,
            total_entrada_dia,
            total_saida_dia,
            total_entrada_semana,
            total_saida_semana,
            total_entrada_mes,
            total_saida_mes,
            transacoes,
            getTransacaoComIcone
        });
    } catch (err) {
        console.error('Erro na consulta:', err);
        res.status(500).send('Erro na consulta ao banco de dados');
    }
});

app.get('/edit-transacao/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM transacoes WHERE id = ?';
    const db = await getConnection();
    db.execute(query, [id], (err, result) => {
        await db.end();
        if (result.length > 0) {
            res.render('edit', { transacao: result[0] });
        } else {
            res.redirect('/');
        }
    });
});

app.post('/add-transacao', async (req, res) => {
    const { tipo, valor, forma_pagamento, nome_do_item, descricao } = req.body;
    const valorNum = parseFloat(valor);
    const query = `
        INSERT INTO transacoes (tipo, valor, forma_pagamento, nome_do_item, descricao, fechado, data)
        VALUES (?, ?, ?, ?, ?, FALSE, CURDATE());
    `;

    try {
        const db = await getConnection();
        await db.execute(query, [tipo, valorNum, forma_pagamento, nome_do_item, descricao]);
        await db.end();
        res.redirect('/');
    } catch (err) {
        console.error('Erro ao inserir a transação:', err);
        res.status(500).send('Erro ao inserir a transação');
    }
});

app.post('/update-transacao', (req, res) => {
    const { id, nome_do_item, tipo, valor, data, forma_pagamento, descricao } = req.body;

    const values = [tipo, valor, data, forma_pagamento, nome_do_item, descricao, id];
    const query = `
        UPDATE transacoes
        SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, nome_do_item = ?, descricao = ?
        WHERE id = ?;
    `;
  const db = await getConnection();
    db.execute(query, values, (err, result) => {
        await db.end();
        if (err) {
            console.error("Erro ao atualizar a transação:", err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar a transação' });
        }
        res.json({ success: true });
    });
});



app.post('/delete-transacao', (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM transacoes WHERE id = ?';
    const db = await getConnection();
    db.execute(query, [id], (err, result) => {
        await db.end();
               res.redirect('/');
    });
});
app.get('/', async (req, res) => {
    const nomeDoItem = req.query.NOME_DO_ITEM || '';
    try {
        const transacoes = await buscarTransacoes(nomeDoItem);
        res.render('index', {
            transacoes: transacoes,
            saldo: calcularSaldo(transacoes),
            total_entrada: calcularTotalEntrada(transacoes),
            total_saida: calcularTotalSaida(transacoes),
            total_entrada_dia: calcularTotalEntradaDia(transacoes),
            total_saida_dia: calcularTotalSaidaDia(transacoes),
            nome_do_item: nomeDoItem
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar transações.');
    }
});
app.post('/fechar-caixa', async (req, res) => {
    const query = 'UPDATE transacoes SET fechado = TRUE WHERE fechado = FALSE';
    try {
        const db = await getConnection();
        await db.execute(query);
        await db.end();
        res.redirect('/'); // Redireciona para a página inicial após a atualização
    } catch (err) {
        console.error("Erro ao fechar caixa:", err);
        res.status(500).send("Erro ao fechar o caixa");
    }
});
app.get('/search', (req, res) => {
    const { nome_do_item } = req.query;
    const query = `
        SELECT
            id,
            tipo,
            forma_pagamento,
            valor,
            NOME_DO_ITEM,
            Descricao,
            DATE_FORMAT(data, '%Y-%m-%d') AS data
        FROM transacoes
        WHERE NOME_DO_ITEM LIKE ?;
    `;
const db = await getConnection();
    db.execute(query, [`%${nome_do_item}%`], (err, transacoes) => {
        await db.end();
        if (err) {
            console.error("Erro ao buscar transações:", err);
            return res.status(500).send('Erro ao buscar transações.');
        }
        res.render('index', {
            transacoes: transacoes,
            NOME_DO_ITEM: nome_do_item,
            getTransacaoComIcone: getTransacaoComIcone
        });
    });
});
app.get('/relatorio-mensal', async (req, res) => {
    const { mes, ano } = req.query;    
    if (!mes || !ano) {
        return res.render('relatorio_mensal', {
            mes: 1,
            ano: 2024,
            total_entrada_mes: 0,
            total_saida_mes: 0,
            saldo_mes: 0,
            transacoes: []
        });
    }
        const resumoQuery = `
            SELECT
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS total_entrada_mes,
                SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS total_saida_mes,
                (SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END)) AS saldo_mes
            FROM transacoes
            WHERE MONTH(data) = ? AND YEAR(data) = ?;
        `;
    const db = await getConnection();
        const [resumoResult] = await db.execute(resumoQuery, [mes, ano]);      
await db.end();
        const total_entrada_mes = parseFloat(resumoResult[0].total_entrada_mes) || 0;
        const total_saida_mes = parseFloat(resumoResult[0].total_saida_mes) || 0;
        const saldo_mes = parseFloat(resumoResult[0].saldo_mes) || 0;
       
        const transacoesQuery = `
            SELECT
                id,
                tipo,
                forma_pagamento,
                valor,
                nome_do_item,
                descricao,
                DATE_FORMAT(data, '%Y-%m-%d') AS data
            FROM transacoes
            WHERE MONTH(data) = ? AND YEAR(data) = ?;
        `;
       const db = await getConnection();
        const [transacoesResult] = await db.execute(transacoesQuery, [mes, ano]);    
    await db.end();
        res.render('relatorio_mensal', {
            mes: mes,
            ano: ano,
            total_entrada_mes: total_entrada_mes,
            total_saida_mes: total_saida_mes,
            saldo_mes: saldo_mes,
            transacoes: transacoesResult 
        });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


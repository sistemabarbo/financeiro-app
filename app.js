const express = require('express');
const path = require('path');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3001;

// Configuração de conexão com o banco de dados MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectTimeout: 60000
};

// Criando um pool de conexões para melhor gerenciamento
const pool = mysql.createPool(dbConfig);

// Função de consulta genérica usando pool
function queryDatabase(query, values = []) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {                
                reject(err);
            } else {               
                
                connection.query(query, values, (err, results) => {
                    connection.release(); // Libera a conexão de volta ao pool
                    if (err) {                        
                        reject(err);
                    } else {                        
                        resolve(results);
                    }
                });
            }
        });
    });
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

        const result = await queryDatabase(query);
        const transacoes = await queryDatabase(queryTransacoes);

        const saldo = parseFloat(result[0]?.saldo) || 0;
        const total_entrada = parseFloat(result[0]?.total_entrada) || 0;
        const total_saida = parseFloat(result[0]?.total_saida) || 0;
        const total_entrada_dia = parseFloat(result[0]?.total_entrada_dia) || 0;
        const total_saida_dia = parseFloat(result[0]?.total_saida_dia) || 0;
        const total_entrada_semana = parseFloat(result[0]?.total_entrada_semana) || 0;
        const total_saida_semana = parseFloat(result[0]?.total_saida_semana) || 0;
        const total_entrada_mes = parseFloat(result[0]?.total_entrada_mes) || 0;
        const total_saida_mes = parseFloat(result[0]?.total_saida_mes) || 0;

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
            transacoes
        });
});

app.post('/add-transacao', async (req, res) => {
    const { tipo, valor, forma_pagamento, nome_do_item, descricao } = req.body;
    const valorNum = parseFloat(valor);

    if (isNaN(valorNum)) {
        return res.status(400).send('Valor inválido');
    }

    const query = `
        INSERT INTO transacoes (tipo, valor, forma_pagamento, nome_do_item, descricao, fechado, data)
        VALUES (?, ?, ?, ?, ?, FALSE, CURDATE());
    `;

    
        await queryDatabase(query, [tipo, valorNum, forma_pagamento, nome_do_item, descricao]);
        res.redirect('/');
   
});

app.post('/update-transacao', async (req, res) => {
    const { id, nome_do_item, tipo, valor, data, forma_pagamento, descricao } = req.body;
    const query = `
        UPDATE transacoes
        SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, nome_do_item = ?, descricao = ?
        WHERE id = ?;
    `;
  
        await queryDatabase(query, [tipo, valor, data, forma_pagamento, nome_do_item, descricao, id]);
        res.redirect('/');   
});

app.post('/delete-transacao', async (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM transacoes WHERE id = ?';
  
        await queryDatabase(query, [id]);
        res.redirect('/');    
});

app.post('/fechar-caixa', async (req, res) => {
    const query = 'UPDATE transacoes SET fechado = TRUE WHERE fechado = FALSE';
   
        await queryDatabase(query);
        res.redirect('/');   
});

app.get('/relatorio-mensal', async (req, res) => {
    
        const { mes, ano } = req.query;

        // Validar mês e ano
        if (!mes || !ano || isNaN(mes) || isNaN(ano)) {
            return res.render('relatorio_mensal', {
                mes: 1,
                ano: 2024,
                total_entrada_mes: 0,
                total_saida_mes: 0,
                saldo_mes: 0,
                carros_pequenos: 0,
                carros_medios: 0,
                carros_grandes: 0,
                estacionamento: 0,
                transacoes: []
            });
        }

        // Consulta de resumo (entrada, saída e saldo)
        const resumoQuery = `
            SELECT
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS total_entrada_mes,
                SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END) AS total_saida_mes
            FROM transacoes
            WHERE MONTH(data) = ? AND YEAR(data) = ?;
        `;

        // Consulta de transações
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

        // Consulta de contagem de carros e estacionamento
        const carrosQuery = `
            SELECT
                SUM(CASE WHEN nome_do_item = 'pequeno' THEN 1 ELSE 0 END) AS carros_pequenos,
                SUM(CASE WHEN nome_do_item = 'medio' THEN 1 ELSE 0 END) AS carros_medios,
                SUM(CASE WHEN nome_do_item = 'grande' THEN 1 ELSE 0 END) AS carros_grandes,
                SUM(CASE WHEN nome_do_item = 'estacionamento' THEN 1 ELSE 0 END) AS estacionamento
            FROM transacoes
            WHERE tipo = 'entrada' AND MONTH(data) = ? AND YEAR(data) = ?;
        `;

        // Executar consultas
        const [resumoResult] = await queryDatabase(resumoQuery, [mes, ano]);
        const transacoesResult = await queryDatabase(transacoesQuery, [mes, ano]);
        const [carrosResult] = await queryDatabase(carrosQuery, [mes, ano]);

        // Processar resultados
        const total_entrada_mes = parseFloat(resumoResult?.total_entrada_mes || 0);
        const total_saida_mes = parseFloat(resumoResult?.total_saida_mes || 0);
        const saldo_mes = total_entrada_mes - total_saida_mes;
        const carros_pequenos = carrosResult?.carros_pequenos || 0;
        const carros_medios = carrosResult?.carros_medios || 0;
        const carros_grandes = carrosResult?.carros_grandes || 0;
        const estacionamento = carrosResult?.estacionamento || 0;

        // Renderizar a página com os dados
        res.render('relatorio_mensal', {
            mes,
            ano,
            total_entrada_mes,
            total_saida_mes,
            saldo_mes,
            carros_pequenos,
            carros_medios,
            carros_grandes,
            estacionamento,
            transacoes: transacoesResult
        });    
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

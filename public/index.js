let transactionsVisible = false;

        function toggleTransactions() {
            const list = document.getElementById('transaction-list');
            const button = document.querySelector('.show-hide-btn');
            if (transactionsVisible) {
                list.classList.add('hidden');
                button.textContent = 'Mostrar Transações';
            } else {
                list.classList.remove('hidden');
                button.textContent = 'Esconder Transações';
            }
            transactionsVisible = !transactionsVisible;
        }

        function openEditModal(transacao) {
            document.getElementById('edit-id').value = transacao.id;
            document.getElementById('edit-tipo').value = transacao.tipo;
            document.getElementById('edit-valor').value = parseFloat(transacao.valor).toFixed(2);
            document.getElementById('edit-data').value = transacao.data;
            document.getElementById('edit-forma_pagamento').value = transacao.forma_pagamento;
            document.getElementById('edit-nome_do_item').value = transacao.nome_do_item;
        
            const modal = document.getElementById('editModal');
            modal.style.display = "block";
        }
        
        function closeEditModal() {
            const modal = document.getElementById('editModal');
            modal.style.display = "none";
        }
        
        window.onclick = function(event) {
            const modal = document.getElementById('editModal');
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }

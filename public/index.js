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
            console.log('Opening modal with transaction:', transacao);
        
            const editId = document.getElementById('edit-id');
            const editTipo = document.getElementById('edit-tipo');
            const editValor = document.getElementById('edit-valor');
            const editData = document.getElementById('edit-data');
            const editFormaPagamento = document.getElementById('edit-forma_pagamento');
            const editNomeDoItem = document.getElementById('edit-nome_do_item');
        
            console.log('Element references:', {
                editId,
                editTipo,
                editValor,
                editData,
                editFormaPagamento,
                editNomeDoItem,
            });
        
            editId.value = transacao.id;
            editTipo.value = transacao.tipo;
            editValor.value = parseFloat(transacao.valor).toFixed(2);
            editData.value = transacao.data;
            editFormaPagamento.value = transacao.forma_pagamento;
            editNomeDoItem.value = transacao.nome_do_item;
        
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
        

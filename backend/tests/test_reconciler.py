import pytest
from backend.ledger import Lancamento, Razao
from backend.reconciler import conciliar, QUITADO, ABERTO, SEM_PAR


def test_par_unico_conciliado():
    razao = Razao(
        arquivo="teste.xlsx",
        lancamentos=[
            Lancamento(id=1, linha=10, tipo="C", valor=15000, data="2026-05-01", historico="COMPRA MATERIAIS FORNECEDOR ALFA", contrapartida="101"),
            Lancamento(id=2, linha=20, tipo="D", valor=15000, data="2026-05-05", historico="PAGAMENTO FORNECEDOR ALFA", contrapartida="101"),
        ],
    )
    resumo = conciliar(razao)
    c = razao.lancamentos[0]
    d = razao.lancamentos[1]

    assert c.status == QUITADO
    assert d.status == QUITADO
    assert c.par == d.id
    assert d.par == c.id
    assert c.amarracao == 1
    assert d.amarracao == 1
    assert resumo["quitados"]["qtd"] == 1


def test_multiplos_debitos_vincula_com_mais_proximo_apos_compra():
    # Compra em 01/07 e dois pagamentos: 05/07 (4d) e 25/07 (24d).
    # Deve vincular automaticamente com o pagamento em 05/07 (mais próximo logo após a compra).
    razao = Razao(
        arquivo="teste.xlsx",
        lancamentos=[
            Lancamento(id=1, linha=10, tipo="C", valor=20000, data="2026-07-01", historico="BOLETO COMPRA", contrapartida="101"),
            Lancamento(id=2, linha=20, tipo="D", valor=20000, data="2026-07-05", historico="PAGTO 1", contrapartida="101"),
            Lancamento(id=3, linha=21, tipo="D", valor=20000, data="2026-07-25", historico="PAGTO 2", contrapartida="101"),
        ],
    )
    resumo = conciliar(razao)
    c1, d1, d2 = razao.lancamentos

    assert c1.status == QUITADO
    assert c1.par == d1.id
    assert d1.status == QUITADO
    assert d1.par == c1.id
    assert d2.status == SEM_PAR
    assert resumo["quitados"]["qtd"] == 1
    assert resumo["sem_par"]["qtd"] == 1


def test_duas_compras_dois_pagamentos_mesmo_valor_pareamento_cronologico():
    # Compra 1 em 01/07, Compra 2 em 20/07.
    # Pagamento 1 em 05/07, Pagamento 2 em 25/07.
    razao = Razao(
        arquivo="teste.xlsx",
        lancamentos=[
            Lancamento(id=1, linha=10, tipo="C", valor=20000, data="2026-07-01", historico="COMPRA A", contrapartida="101"),
            Lancamento(id=2, linha=11, tipo="C", valor=20000, data="2026-07-20", historico="COMPRA B", contrapartida="101"),
            Lancamento(id=3, linha=20, tipo="D", valor=20000, data="2026-07-05", historico="PAGTO 1", contrapartida="101"),
            Lancamento(id=4, linha=21, tipo="D", valor=20000, data="2026-07-25", historico="PAGTO 2", contrapartida="101"),
        ],
    )
    resumo = conciliar(razao)
    c1, c2, d1, d2 = razao.lancamentos

    # Compra 1 (01/07) amarra com Pagamento 1 (05/07)
    assert c1.status == QUITADO and c1.par == d1.id
    assert d1.status == QUITADO and d1.par == c1.id

    # Compra 2 (20/07) amarra com Pagamento 2 (25/07)
    assert c2.status == QUITADO and c2.par == d2.id
    assert d2.status == QUITADO and d2.par == c2.id
    assert resumo["quitados"]["qtd"] == 2


def test_fornecedor_exclusivo_desfaz_ambiguidade_mesmo_com_datas_diferentes():
    # Dois créditos e dois débitos de R$ 400,00 com fornecedores identificáveis correspondentes
    razao = Razao(
        arquivo="teste.xlsx",
        lancamentos=[
            Lancamento(id=1, linha=10, tipo="C", valor=40000, data="2026-05-01", historico="NF KROTON EDUCACIONAL", contrapartida="101"),
            Lancamento(id=2, linha=11, tipo="C", valor=40000, data="2026-05-02", historico="NF AMBEV BEBIDAS", contrapartida="101"),
            Lancamento(id=3, linha=20, tipo="D", valor=40000, data="2026-05-10", historico="PAGTO TITULO AMBEV", contrapartida="101"),
            Lancamento(id=4, linha=21, tipo="D", valor=40000, data="2026-05-11", historico="PAGTO TITULO KROTON", contrapartida="101"),
        ],
    )
    resumo = conciliar(razao)
    c_kroton, c_ambev, d_ambev, d_kroton = razao.lancamentos

    assert c_kroton.status == QUITADO and c_kroton.par == d_kroton.id
    assert d_kroton.status == QUITADO and d_kroton.par == c_kroton.id
    assert c_ambev.status == QUITADO and c_ambev.par == d_ambev.id
    assert d_ambev.status == QUITADO and d_ambev.par == c_ambev.id
    assert resumo["quitados"]["qtd"] == 2

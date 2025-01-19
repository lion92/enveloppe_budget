import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./Budget.css";

const BudgetManager = () => {
    const [envelopes, setEnvelopes] = useState([]);
    const [envelopeName, setEnvelopeName] = useState("");
    const [initialBalance, setInitialBalance] = useState("");
    const [filterName, setFilterName] = useState("");
    const [filterAmount, setFilterAmount] = useState("");
    const [filterCondition, setFilterCondition] = useState("greater");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [salary, setSalary] = useState(0);
    const [remainingSalary, setRemainingSalary] = useState(0);
    const [salaryDate, setSalaryDate] = useState("");
    const [salaryHistory, setSalaryHistory] = useState([]);
    const [transactionAmount, setTransactionAmount] = useState("");
    const [transactionDate, setTransactionDate] = useState("");
    const [transactionType, setTransactionType] = useState("add");
    const [impactSalary, setImpactSalary] = useState(false);
    const [impactSalaryOnCreate, setImpactSalaryOnCreate] = useState(false);
    const [selectedEnvelopeId, setSelectedEnvelopeId] = useState("");

    // Charger les données depuis le localStorage au démarrage
    useEffect(() => {
        const storedEnvelopes = JSON.parse(localStorage.getItem("envelopes")) || [];
        const storedSalary = JSON.parse(localStorage.getItem("salary")) || 0;
        const storedRemainingSalary =
            JSON.parse(localStorage.getItem("remainingSalary")) || 0;
        const storedSalaryHistory =
            JSON.parse(localStorage.getItem("salaryHistory")) || [];

        setEnvelopes(storedEnvelopes);
        setSalary(storedSalary);
        setRemainingSalary(storedRemainingSalary);
        setSalaryHistory(storedSalaryHistory);
    }, []);

    // Sauvegarder les enveloppes, salaire et historique dans le localStorage à chaque mise à jour
    useEffect(() => {
        localStorage.setItem("envelopes", JSON.stringify(envelopes));
        localStorage.setItem("salary", JSON.stringify(salary));
        localStorage.setItem("remainingSalary", JSON.stringify(remainingSalary));
        localStorage.setItem("salaryHistory", JSON.stringify(salaryHistory));
    }, [envelopes, salary, remainingSalary, salaryHistory]);

    // Ajouter un salaire global
    const addSalary = () => {
        if (!salary || !salaryDate) {
            alert("Veuillez saisir le montant et la date du salaire !");
            return;
        }

        const salaryAmount = parseFloat(salary);

        if (salaryAmount <= 0) {
            alert("Le salaire doit être supérieur à zéro !");
            return;
        }

        setRemainingSalary(remainingSalary + salaryAmount);
        setSalaryHistory([
            ...salaryHistory,
            { date: salaryDate, amount: salaryAmount },
        ]);
        setSalaryDate("");
        setSalary(0);
    };

    // Créer une nouvelle enveloppe
    const createEnvelope = () => {
        if (!envelopeName || !initialBalance) {
            alert("Veuillez renseigner le nom et le solde initial !");
            return;
        }

        const initialBalanceValue = parseFloat(initialBalance);

        if (impactSalaryOnCreate) {
            if (initialBalanceValue > remainingSalary) {
                alert(
                    "Le salaire restant est insuffisant pour allouer ce montant à l'enveloppe !"
                );
                return;
            }
            setRemainingSalary(remainingSalary - initialBalanceValue);
        }

        const newEnvelope = {
            id: Date.now(),
            name: envelopeName,
            balance: initialBalanceValue,
            createdDate: new Date().toLocaleDateString("fr-CA"),
            transactions: [], // Historique des transactions (ajouts/retraits)
        };

        setEnvelopes([...envelopes, newEnvelope]);
        setEnvelopeName("");
        setInitialBalance("");
    };

    // Ajouter ou retirer une somme dans une enveloppe
    const handleTransaction = () => {
        if (!transactionAmount || !selectedEnvelopeId || !transactionDate) {
            alert("Veuillez sélectionner une enveloppe, une somme et une date !");
            return;
        }

        const transactionValue = parseFloat(transactionAmount);

        if (transactionValue <= 0) {
            alert("La somme doit être supérieure à zéro !");
            return;
        }

        const updatedEnvelopes = envelopes.map((envelope) => {
            if (envelope.id === parseInt(selectedEnvelopeId)) {
                const newBalance =
                    transactionType === "add"
                        ? envelope.balance + transactionValue
                        : envelope.balance - transactionValue;

                if (transactionType === "remove" && transactionValue > envelope.balance) {
                    alert("Le solde de l'enveloppe est insuffisant !");
                    return envelope;
                }

                // Si l'option "impactSalary" est activée, ajuster le salaire restant
                if (impactSalary) {
                    const updatedRemainingSalary =
                        transactionType === "add"
                            ? remainingSalary - transactionValue
                            : remainingSalary + transactionValue;

                    if (updatedRemainingSalary < 0) {
                        alert("Le salaire restant est insuffisant pour cette opération !");
                        return envelope;
                    }

                    setRemainingSalary(updatedRemainingSalary);
                }

                return {
                    ...envelope,
                    balance: newBalance,
                    transactions: [
                        ...envelope.transactions,
                        {
                            date: transactionDate,
                            type: transactionType,
                            amount: transactionValue,
                        },
                    ],
                };
            }
            return envelope;
        });

        setEnvelopes(updatedEnvelopes);
        setTransactionAmount("");
        setTransactionDate("");
        setTransactionType("add");
        setSelectedEnvelopeId("");
    };

    // Supprimer une enveloppe
    const deleteEnvelope = (id) => {
        const envelopeToDelete = envelopes.find((envelope) => envelope.id === id);

        if (envelopeToDelete && envelopeToDelete.balance > 0) {
            alert(
                `Impossible de supprimer l'enveloppe "${envelopeToDelete.name}" car elle contient un montant de ${envelopeToDelete.balance.toFixed(
                    2
                )} €. Veuillez vider son solde avant de la supprimer.`
            );
            return;
        }

        const updatedEnvelopes = envelopes.filter((envelope) => envelope.id !== id);
        setEnvelopes(updatedEnvelopes);
    };

    // Appliquer les filtres
    const applyFilters = () => {
        let filteredEnvelopes = envelopes;

        // Filtrer par nom
        if (filterName) {
            filteredEnvelopes = filteredEnvelopes.filter((envelope) =>
                envelope.name.toLowerCase().includes(filterName.toLowerCase())
            );
        }

        // Filtrer par montant
        if (filterAmount) {
            const amount = parseFloat(filterAmount);
            switch (filterCondition) {
                case "greater":
                    filteredEnvelopes = filteredEnvelopes.filter(
                        (envelope) => envelope.balance > amount
                    );
                    break;
                case "less":
                    filteredEnvelopes = filteredEnvelopes.filter(
                        (envelope) => envelope.balance < amount
                    );
                    break;
                case "equal":
                    filteredEnvelopes = filteredEnvelopes.filter(
                        (envelope) => envelope.balance === amount
                    );
                    break;
                default:
                    break;
            }
        }

        // Filtrer par date de création
        if (filterStartDate || filterEndDate) {
            filteredEnvelopes = filteredEnvelopes.filter((envelope) => {
                const envelopeDate = new Date(envelope.createdDate);
                const startDate = filterStartDate ? new Date(filterStartDate) : null;
                const endDate = filterEndDate ? new Date(filterEndDate) : null;

                if (startDate && envelopeDate < startDate) return false;
                if (endDate && envelopeDate > endDate) return false;

                return true;
            });
        }

        return filteredEnvelopes;
    };

    // Exporter les enveloppes filtrées en Excel
    const exportEnvelopesToExcel = () => {
        const filteredEnvelopes = applyFilters();
        const worksheetData = filteredEnvelopes.map((envelope) => ({
            "Nom de l'enveloppe": envelope.name,
            "Solde (€)": envelope.balance.toFixed(2),
            "Date de création": envelope.createdDate,
            "Historique des transactions": envelope.transactions
                .map(
                    (transaction) =>
                        `${transaction.date} - ${
                            transaction.type === "add" ? "Ajout" : "Retrait"
                        } : ${transaction.amount.toFixed(2)} €`
                )
                .join(", "),
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Enveloppes");

        XLSX.writeFile(workbook, "Enveloppes.xlsx");
    };

    // Exporter l'historique des salaires en Excel
    const exportSalariesToExcel = () => {
        const worksheetData = salaryHistory.map((entry, index) => ({
            "N°": index + 1,
            "Date du salaire": entry.date,
            "Montant (€)": entry.amount.toFixed(2),
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Salaires");

        XLSX.writeFile(workbook, "Salaires.xlsx");
    };

    const filteredEnvelopes = applyFilters();

    return (
        <div className="budget-manager">
            <h1 className="title">Gestion des Enveloppes</h1>

            {/* Ajouter un salaire */}
            <div className="form">
                <input
                    type="number"
                    placeholder="Montant du salaire (€)"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="input"
                />
                <input
                    type="date"
                    placeholder="Date du salaire"
                    value={salaryDate}
                    onChange={(e) => setSalaryDate(e.target.value)}
                    className="input"
                />
                <button onClick={addSalary} className="add-button">
                    Ajouter un salaire
                </button>
                <p>Salaire restant : {remainingSalary.toFixed(2)} €</p>
                <button onClick={exportSalariesToExcel} className="export-button">
                    Exporter les Salaires en Excel
                </button>
            </div>

            {/* Historique des salaires */}
            <div className="salary-history">
                <h2>Historique des Salaires</h2>
                <ul>
                    {salaryHistory.map((entry, index) => (
                        <li key={index}>
                            {entry.date} : {entry.amount.toFixed(2)} €
                        </li>
                    ))}
                </ul>
            </div>

            {/* Créer une enveloppe */}
            <div className="form">
                <input
                    type="text"
                    placeholder="Nom de l'enveloppe"
                    value={envelopeName}
                    onChange={(e) => setEnvelopeName(e.target.value)}
                    className="input"
                />
                <input
                    type="number"
                    placeholder="Solde initial (€)"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="input"
                />
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={impactSalaryOnCreate}
                        onChange={(e) => setImpactSalaryOnCreate(e.target.checked)}
                    />
                    Impacter le salaire restant
                </label>
                <button onClick={createEnvelope} className="add-button">
                    Créer une enveloppe
                </button>
            </div>

            {/* Ajouter ou retirer une somme */}
            <div className="form">
                <select
                    value={selectedEnvelopeId}
                    onChange={(e) => setSelectedEnvelopeId(e.target.value)}
                    className="select"
                >
                    <option value="">Sélectionner une enveloppe</option>
                    {envelopes.map((envelope) => (
                        <option key={envelope.id} value={envelope.id}>
                            {envelope.name}
                        </option>
                    ))}
                </select>
                <input
                    type="number"
                    placeholder="Montant (€)"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="input"
                />
                <input
                    type="date"
                    placeholder="Date de la transaction"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="input"
                />
                <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="select"
                >
                    <option value="add">Ajouter</option>
                    <option value="remove">Retirer</option>
                </select>
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={impactSalary}
                        onChange={(e) => setImpactSalary(e.target.checked)}
                    />
                    Impacter le salaire restant
                </label>
                <button onClick={handleTransaction} className="add-button">
                    Valider
                </button>
            </div>

            {/* Filtres */}
            <div className="form">
                <input
                    type="text"
                    placeholder="Filtrer par nom"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="input"
                />
                <input
                    type="number"
                    placeholder="Montant"
                    value={filterAmount}
                    onChange={(e) => setFilterAmount(e.target.value)}
                    className="input"
                />
                <select
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                    className="select"
                >
                    <option value="greater">Supérieur à</option>
                    <option value="less">Inférieur à</option>
                    <option value="equal">Égal à</option>
                </select>
                <input
                    type="date"
                    placeholder="Date de début"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="input"
                />
                <input
                    type="date"
                    placeholder="Date de fin"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="input"
                />
                <button onClick={exportEnvelopesToExcel} className="export-button">
                    Exporter les Enveloppes en Excel
                </button>
            </div>

            {/* Liste des enveloppes filtrées */}
            <h2 className="subtitle">Enveloppes</h2>
            <ul className="envelope-list">
                {filteredEnvelopes.map((envelope) => (
                    <li key={envelope.id} className="envelope-item">
                        <strong>{envelope.name}</strong> - Solde : {envelope.balance.toFixed(2)} €
                        <br />
                        <small>Date de création : {envelope.createdDate}</small>
                        <br />
                        <small>
                            Transactions :
                            <ul>
                                {envelope.transactions.map((transaction, idx) => (
                                    <li key={idx}>
                                        {transaction.date} -{" "}
                                        {transaction.type === "add" ? "Ajout" : "Retrait"} :{" "}
                                        {transaction.amount.toFixed(2)} €
                                    </li>
                                ))}
                            </ul>
                        </small>
                        <br />
                        <button
                            onClick={() => deleteEnvelope(envelope.id)}
                            className="delete-button"
                        >
                            Supprimer
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BudgetManager;
``

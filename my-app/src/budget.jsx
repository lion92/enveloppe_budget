import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { jsPDF } from "jspdf";
import '../src/budget.css';

const App = () => {
    const [envelopes, setEnvelopes] = useState(() => {
        const savedEnvelopes = localStorage.getItem("budgetEnvelopes");
        if (savedEnvelopes) {
            return JSON.parse(savedEnvelopes).map(envelope => ({
                ...envelope,
                history: envelope.history || [] // Assurer que l'historique existe
            }));
        }
        return [];
    });

    const [newEnvelope, setNewEnvelope] = useState({ name: "", amount: "" });
    const [updateAmount, setUpdateAmount] = useState("");

    useEffect(() => {
        localStorage.setItem("budgetEnvelopes", JSON.stringify(envelopes));
    }, [envelopes]);

    const handleAddEnvelope = () => {
        if (newEnvelope.name.trim() && newEnvelope.amount > 0) {
            setEnvelopes([...envelopes, { ...newEnvelope, id: Date.now(), history: [] }]);
            setNewEnvelope({ name: "", amount: "" });
        }
    };

    const handleDeleteEnvelope = (id) => {
        setEnvelopes(envelopes.filter((envelope) => envelope.id !== id));
    };

    const handleUpdateAmount = (id, type) => {
        if (updateAmount.trim() && !isNaN(updateAmount)) {
            setEnvelopes(envelopes.map((envelope) => {
                if (envelope.id === id) {
                    const updateValue = parseFloat(updateAmount);
                    const updatedAmount =
                        type === "add"
                            ? parseFloat(envelope.amount) + updateValue
                            : parseFloat(envelope.amount) - updateValue;

                    if (type === "subtract" && updatedAmount < 0) {
                        alert("Action refusée : Vous ne pouvez pas avoir un solde négatif.");
                        return envelope;
                    }

                    const newHistory = [
                        ...envelope.history,
                        {
                            type: type === "add" ? "Ajout" : "Retrait",
                            amount: updateValue,
                            date: new Date().toLocaleString(),
                        },
                    ];

                    return {
                        ...envelope,
                        amount: updatedAmount,
                        history: newHistory,
                    };
                }
                return envelope;
            }));
            setUpdateAmount("");
        }
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Gestionnaire de Budget", 20, 20);

        doc.setFontSize(12);
        envelopes.forEach((envelope, index) => {
            const y = 30 + index * 10;
            doc.text(`${index + 1}. ${envelope.name} - ${envelope.amount} euro`, 20, y);
            envelope.history.forEach((entry, hIndex) => {
                const historyY = y + (hIndex + 1) * 5;
                doc.text(`    ${entry.date} - ${entry.type}: ${entry.amount} euro`, 20, historyY);
            });
        });

        doc.save("budget_envelopes.pdf");
    };

    return (
        <div style={{ maxWidth: "500px", margin: "0 auto", padding: "1rem" }}>
            <h1>Gestionnaire de Budget</h1>

            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    placeholder="Nom de l'enveloppe"
                    value={newEnvelope.name}
                    onChange={(e) => setNewEnvelope({ ...newEnvelope, name: e.target.value })}
                    style={{ marginRight: "0.5rem", padding: "0.5rem" }}
                />
                <input
                    type="number"
                    placeholder="Montant"
                    value={newEnvelope.amount}
                    onChange={(e) => setNewEnvelope({ ...newEnvelope, amount: e.target.value })}
                    style={{ marginRight: "0.5rem", padding: "0.5rem" }}
                />
                <button onClick={handleAddEnvelope} style={{ padding: "0.5rem" }}>Ajouter</button>
            </div>

            <button onClick={handleDownloadPDF} style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#4a90e2", color: "white", border: "none", borderRadius: "5px" }}>Télécharger PDF</button>

            <ul style={{ listStyleType: "none", padding: 0 }}>
                {envelopes.map((envelope) => (
                    <li
                        key={envelope.id}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            marginBottom: "1rem",
                            padding: "0.5rem",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                        }}
                    >
                        <span>{envelope.name} - {envelope.amount} euro</span>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                            <input
                                type="number"
                                placeholder="Montant"
                                value={updateAmount}
                                onChange={(e) => setUpdateAmount(e.target.value)}
                                style={{ padding: "0.5rem" }}
                            />
                            <button onClick={() => handleUpdateAmount(envelope.id, "add")} style={{ padding: "0.5rem" }}>Ajouter</button>
                            <button onClick={() => handleUpdateAmount(envelope.id, "subtract")} style={{ padding: "0.5rem" }}>Retirer</button>
                        </div>
                        <button onClick={() => handleDeleteEnvelope(envelope.id)} style={{ marginTop: "0.5rem", padding: "0.25rem 0.5rem" }}>Supprimer</button>

                        <div style={{ marginTop: "0.5rem" }}>
                            <h4>Historique</h4>
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {(envelope.history || []).map((entry, index) => (
                                    <li key={index} style={{ fontSize: "0.9rem" }}>
                                        {entry.date} - {entry.type}: {entry.amount} euro
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

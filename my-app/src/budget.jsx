import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import html2canvas from 'html2canvas';
import '../src/budget.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const App = () => {
    const [envelopes, setEnvelopes] = useState(() => {
        const savedEnvelopes = localStorage.getItem("budgetEnvelopes");
        if (savedEnvelopes) {
            return JSON.parse(savedEnvelopes).map(envelope => ({
                ...envelope,
                history: envelope.history || []
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

    const handleExportExcel = () => {
        const workbook = XLSX.utils.book_new();

        envelopes.forEach((envelope) => {
            const data = [
                ["Nom de l'Enveloppe", envelope.name],
                ["Montant Total", envelope.amount],
                ["Historique"],
                ["Date", "Type", "Montant"],
                ...envelope.history.map((entry) => [entry.date, entry.type, entry.amount]),
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, envelope.name);
        });

        XLSX.writeFile(workbook, "budget_envelopes.xlsx");
    };

    const handleImportExcel = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const importedEnvelopes = [];

            workbook.SheetNames.forEach((sheetName) => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (rows.length > 0) {
                    const name = rows[0][1] || "";
                    const amount = parseFloat(rows[1][1]) || 0;
                    const history = rows.slice(4).map((row) => ({
                        date: row[0] || "",
                        type: row[1] || "",
                        amount: parseFloat(row[2]) || 0,
                    }));

                    importedEnvelopes.push({
                        id: Date.now() + Math.random(),
                        name,
                        amount,
                        history,
                    });
                }
            });

            setEnvelopes([...envelopes, ...importedEnvelopes]);
        };

        reader.readAsArrayBuffer(file);
    };

    const handleExportPDF = async () => {
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(18);
        doc.text("Gestionnaire de Budget", 20, y);
        y += 10;

        for (const envelope of envelopes) {
            // Ajouter les détails de l'enveloppe
            doc.setFontSize(12);
            doc.text(`${envelope.name} - ${envelope.amount} euro`, 20, y);
            y += 10;

            // Ajouter l'historique
            for (const entry of envelope.history) {
                doc.text(`   ${entry.date} - ${entry.type}: ${entry.amount} euro`, 20, y);
                y += 10;

                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
            }

            // Capturer le graphique
            const chartElement = document.querySelector(`#chart-${envelope.id}`);
            if (chartElement) {
                try {
                    const canvas = await html2canvas(chartElement);
                    const imgData = canvas.toDataURL("image/png");
                    doc.addImage(imgData, "PNG", 15, y, 180, 100);
                    y += 110;

                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                } catch (error) {
                    console.error("Erreur lors de la capture du graphique :", error);
                }
            }
        }

        doc.save("budget_envelopes_with_charts.pdf");
    };

    const generateChartData = (history, initialAmount) => {
        const labels = history.map((entry) => entry.date);
        const data = history.reduce(
            (acc, entry) => {
                const prevAmount = acc.length > 0 ? acc[acc.length - 1] : initialAmount;
                const updatedAmount = entry.type === "Ajout"
                    ? prevAmount + entry.amount
                    : prevAmount - entry.amount;
                acc.push(updatedAmount);
                return acc;
            },
            [initialAmount] // Inclure le montant initial
        );

        return {
            labels,
            datasets: [
                {
                    label: "Montant Final",
                    data,
                    fill: false,
                    borderColor: "#4caf50",
                    tension: 0.1,
                },
            ],
        };
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

            <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="importFile" style={{ marginRight: "0.5rem" }}>Importer un fichier Excel:</label>
                <input
                    type="file"
                    id="importFile"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                    style={{ padding: "0.5rem" }}
                />
            </div>

            <button onClick={handleExportExcel} style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "5px" }}>Exporter en Excel</button>
            <button onClick={handleExportPDF} style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "5px" }}>Exporter en PDF</button>

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
                        <div id={`chart-${envelope.id}`} style={{ marginTop: "1rem" }}>
                            <Line data={generateChartData(envelope.history, envelope.amount)} />
                        </div>
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

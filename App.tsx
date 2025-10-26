import React, { useState, useCallback, useRef } from 'react';
import type { NodeData } from './types';

// Allow TypeScript to recognize global libraries loaded via CDN
declare const XLSX: any;
declare const html2canvas: any;

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const CameraIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
);

interface DataTableProps {
    data: NodeData[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-center text-gray-400">No data to display.</p>;
    }

    const headers = Object.keys(data[0]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'UP': return 'bg-green-500/20 text-green-300';
            case 'DOWN': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-700/20 text-gray-300';
        }
    };
    
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700 bg-gray-800">
                <thead className="bg-gray-700/50">
                    <tr>
                        {headers.map(header => (
                            <th key={header} scope="col" className="px-4 py-3.5 text-left text-sm font-semibold text-gray-300">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {headers.map(header => (
                                <td key={`${rowIndex}-${header}`} className="whitespace-nowrap px-4 py-4 text-sm text-gray-300">
                                    {header === 'Status' ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row[header] as string)}`}>
                                            {row[header]}
                                        </span>
                                    ) : (
                                        row[header]
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface SnapshotViewProps {
    data: NodeData[] | null;
}

const SnapshotView: React.FC<SnapshotViewProps> = ({ data }) => (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Node Status</h3>
        <div className="space-y-2">
            {data?.map((row, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                    <span className="font-mono text-sm text-gray-300">{row.Node}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.Status === 'UP' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                        {row.Status}
                    </span>
                </div>
            ))}
        </div>
    </div>
);


export default function App() {
    const [processedData, setProcessedData] = useState<NodeData[] | null>(null);
    const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const snapshotRef = useRef<HTMLDivElement>(null);

    const processData = useCallback((excelData: any[]) => {
        setError(null);
        setSnapshotImage(null);
        setProcessedData(null);

        if (!excelData || excelData.length === 0) {
            setError("The Excel file is empty or could not be read.");
            setIsLoading(false);
            return;
        }

        const headers = Object.keys(excelData[0]);

        if (!headers.includes('Node')) {
            setError("The uploaded Excel file is missing the required 'Node' column.");
            setIsLoading(false);
            return;
        }
        
        const packetLossHeader = headers.find(h => h.trim().toLowerCase() === 'packet loss' || h.trim().toLowerCase() === '% packet loss');

        if (!packetLossHeader) {
            setError("The uploaded Excel file is missing a 'Packet loss' or '% Packet Loss' column.");
            setIsLoading(false);
            return;
        }
        
        const prefixes = ['ATM-SUL', 'ATM-DUK', 'ATM-ERB', 'BR-SUL', 'BR-DUK', 'BR-ERB'];

        const filteredData = excelData.filter(row => {
            const node = String(row.Node || '');
            const startsWithPrefix = prefixes.some(prefix => node.startsWith(prefix));
            const containsSW = node.includes('-SW');
            return startsWithPrefix && !containsSW;
        });

        if (filteredData.length === 0) {
            setError("No matching nodes found in the uploaded file. Ensure nodes start with prefixes like 'ATM-SUL', don't contain '-SW', etc.");
            setIsLoading(false);
            return;
        }

        const transformedData: NodeData[] = filteredData.map((row): NodeData => {
            const packetLoss = String(row[packetLossHeader] || '0').trim();
            const normalizedPacketLoss = packetLoss.replace(/\s/g, '');
            const isDown = normalizedPacketLoss === '100%' || normalizedPacketLoss === '100';
            
            const newRow = { ...row };
            delete newRow[packetLossHeader];

            return {
                ...newRow,
                Node: String(row.Node),
                Status: isDown ? 'DOWN' : 'UP',
                'IP Address': String(row['IP Address'] || 'N/A'),
                'Packet loss': packetLoss,
            };
        });

        transformedData.sort((a, b) => {
            // Sort by Status first: 'DOWN' comes before 'UP'
            if (a.Status !== b.Status) {
                return a.Status === 'DOWN' ? -1 : 1;
            }
            // If statuses are the same, sort by Node name alphabetically
            return a.Node.localeCompare(b.Node);
        });

        setProcessedData(transformedData);
        setIsLoading(false);

    }, []);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                processData(json);
            } catch (err) {
                console.error(err);
                setError("Failed to process the Excel file. Please ensure it is a valid .xlsx or .xls file.");
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Failed to read the file.");
             setIsLoading(false);
        }
        reader.readAsArrayBuffer(file);
    };

    const handleGenerateSnapshot = async () => {
        if (!snapshotRef.current) return;
        setIsLoading(true);
        try {
            const canvas = await html2canvas(snapshotRef.current, {
                backgroundColor: null,
                scale: 2,
            });
            setSnapshotImage(canvas.toDataURL('image/png'));
        } catch (err) {
            console.error(err);
            setError('Failed to generate snapshot image.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const downloadExcel = () => {
        if (!processedData) return;

        const dataToExport = processedData.map(({ ...rest }) => rest);
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        let statusColIndex = -1;

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (worksheet[address] && worksheet[address].v === 'Status') {
                statusColIndex = C;
                break;
            }
        }

        if (statusColIndex !== -1) {
            // Apply styles to each cell in the 'Status' column (skipping header row)
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const address = XLSX.utils.encode_cell({ r: R, c: statusColIndex });
                const cell = worksheet[address];

                if (cell && cell.v) {
                    let cellStyle = {};
                    // Style for 'UP' status
                    if (cell.v === 'UP') {
                        cellStyle = {
                            fill: { fgColor: { rgb: "C6EFCE" } }, // Light Green background
                            font: { color: { rgb: "006100" } }    // Dark Green font
                        };
                        console.log(`Styling cell ${address} as UP`);
                    // Style for 'DOWN' status
                    } else if (cell.v === 'DOWN') {
                        cellStyle = {
                            fill: { fgColor: { rgb: "FFC7CE" } }, // Light Red background
                            font: { color: { rgb: "9C0006" } }    // Dark Red font
                        };
                         console.log(`Styling cell ${address} as DOWN`);
                    }
                    
                    // Assign the style object to the cell
                    cell.s = cellStyle;
                }
            }
        } else {
            console.warn("Could not find 'Status' column to apply styling.");
        }
        
        const colWidths = Object.keys(dataToExport[0] || {}).map(key => {
            const maxLen = Math.max(
                ...dataToExport.map(row => String(row[key] || '').length),
                key.length
            );
            return { wch: maxLen + 2 };
        });
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Modified Status');
        XLSX.writeFile(workbook, 'Modified_Node_Status.xlsx');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-4xl font-bold text-white">Node Status Processor</h1>
                    <p className="mt-2 text-lg text-gray-400">Filter node data, determine status from packet loss, and export results.</p>
                </header>

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                    <div className="flex flex-col justify-center items-center text-center">
                        <h2 className="text-xl font-semibold text-white mb-4">Upload Node Status File</h2>
                         <p className="text-gray-400 mb-6 max-w-md">
                            Select an Excel file with node data. The tool filters for specific nodes, sets status by packet loss, and sorts the results.
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            <UploadIcon className="w-6 h-6" />
                            <span>{isLoading ? 'Processing...' : 'Select Excel File'}</span>
                        </button>
                        <p className="text-xs text-gray-500 mt-2">.xlsx or .xls files supported</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                
                {isLoading && !processedData && (
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                        <p className="mt-4 text-gray-400">Processing data...</p>
                    </div>
                )}

                {processedData && (
                    <div className="space-y-8 mt-8 animate-fade-in">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h2 className="text-2xl font-semibold text-white mb-4">Processed Data</h2>
                            <DataTable data={processedData} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <h2 className="text-2xl font-semibold text-white mb-4">Actions</h2>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button onClick={downloadExcel} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition duration-200">
                                        <DownloadIcon className="w-5 h-5" /> Download Excel
                                    </button>
                                    <button onClick={handleGenerateSnapshot} disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition duration-200 disabled:bg-gray-500">
                                        <CameraIcon className="w-5 h-5" /> {isLoading && !snapshotImage ? 'Generating...' : 'Create Snapshot'}
                                    </button>
                                </div>
                            </div>

                             <div id="snapshot-container" className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                                <h2 className="text-2xl font-semibold text-white mb-4">Snapshot Preview</h2>
                                {snapshotImage ? (
                                    <div className="space-y-4">
                                        <img src={snapshotImage} alt="Node Status Snapshot" className="rounded-lg border border-gray-600 w-full" />
                                        <a href={snapshotImage} download="node_status_snapshot.png" className="block text-center w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition duration-200">
                                            Download Snapshot Image
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-center py-10">Click "Create Snapshot" to generate a preview image here.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden element for html2canvas to render */}
            <div className="absolute -left-full top-0">
                <div ref={snapshotRef} className="p-4 bg-gray-800 w-[400px]">
                    {processedData && <SnapshotView data={processedData} />}
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

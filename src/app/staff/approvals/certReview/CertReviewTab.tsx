import Loading from "@/components/loading";
import { useGetCertReviewQueueQuery } from "@/redux/features/certReviewSlice";
import { useState } from "react";
import CertReviewModal from "./CertReviewModal";
import CertReviewRow from "./CertReviewRow";
import styles from "./certReview.module.css";

interface Props {
    user: any;
}

export default function CertReviewTab({ user }: Props) {
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data, isLoading } = useGetCertReviewQueueQuery(
        { userRole: user?.role || "" },
        { skip: !user?.role }
    );

    const items: any[] = data?.data?.certificates || data?.data || [];
    if (data) console.log("[CertReviewTab] raw response:", data, "resolved items:", items);

    // Group certificates by company ID (keyed by ID, display name shown in header)
    const grouped = items.reduce<Record<string, { name: string; certs: any[] }>>((acc, item) => {
        const companyId = item.company?._id || "unknown";
        if (!acc[companyId]) {
            acc[companyId] = { name: item.company?.companyName || companyId, certs: [] };
        }
        acc[companyId].certs.push(item);
        return acc;
    }, {});

    if (isLoading) {
        return <Loading message="Loading certificate review queue..." />;
    }

    return (
        <div className={styles.certReviewTab}>
            {selectedItem && (
                <CertReviewModal
                    item={selectedItem}
                    userRole={user?.role || ""}
                    onClose={() => setSelectedItem(null)}
                />
            )}

            {items.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No certificates awaiting review.</p>
                </div>
            ) : (
                Object.entries(grouped).map(([companyId, { name, certs }]) => (
                    <div key={companyId} className={styles.companyGroup}>
                        <div className={styles.companyGroupHeader}>
                            {name}
                        </div>
                        <table className={styles.queueTable}>
                            <thead>
                                <tr>
                                    <th>Certificate</th>
                                    <th>Section</th>
                                    <th>File</th>
                                    <th>Submitted</th>
                                    <th>Expiry Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map((item: any, index: number) => (
                                    <CertReviewRow
                                        key={item._id || index}
                                        item={item}
                                        onReview={setSelectedItem}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </div>
    );
}

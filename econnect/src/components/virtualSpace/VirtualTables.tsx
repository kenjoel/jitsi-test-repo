import React, { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { VirtualTable, User } from "../../types";
import JitsiContainer from "../meetings/JitsiContainer";

// Helper function to convert Firestore timestamp to JavaScript Date
const convertTimestamp = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
};

interface VirtualTablesProps {
  eventId: string;
  isHost?: boolean;
  onBroadcastStart?: () => void;
}

const VirtualTables: React.FC<VirtualTablesProps> = ({
  eventId,
  isHost = false,
  onBroadcastStart,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [tables, setTables] = useState<VirtualTable[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<VirtualTable | null>(null);
  const [joinedTable, setJoinedTable] = useState<VirtualTable | null>(null);
  const [showJitsi, setShowJitsi] = useState<boolean>(false);

  // State for create table dialog
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(6);
  const [creatingTable, setCreatingTable] = useState<boolean>(false);

  // Fetch tables for the event
  useEffect(() => {
    const fetchTables = async () => {
      if (!eventId) {
        setError("Invalid event ID");
        setLoading(false);
        return;
      }

      try {
        const tablesQuery = query(
          collection(firestore, "virtualTables"),
          where("eventId", "==", eventId)
        );
        const tablesSnapshot = await getDocs(tablesQuery);
        const tablesData = tablesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: convertTimestamp(data.createdAt) || new Date(),
            updatedAt: convertTimestamp(data.updatedAt) || new Date()
          } as VirtualTable;
        });
        setTables(tablesData);

        // Fetch user data for all participants
        const userIdsSet = new Set<string>();
        tablesData.forEach((table) => {
          table.participants.forEach((userId) => userIdsSet.add(userId));
        });

        // Convert Set to Array for iteration
        const userIds = Array.from(userIdsSet);

        const usersData: Record<string, User> = {};
        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i];
          const userDoc = await getDoc(doc(firestore, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            usersData[userId] = {
              ...userData,
              createdAt: convertTimestamp(userData.createdAt) || new Date(),
              updatedAt: convertTimestamp(userData.updatedAt) || new Date()
            } as User;
          }
        }
        setUsers(usersData);

        // Check if user is already at a table
        if (currentUser) {
          const joinedTableData = tablesData.find((table) =>
            table.participants.includes(currentUser.uid)
          );
          if (joinedTableData) {
            setJoinedTable(joinedTableData);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching tables:", error);
        setError("Failed to load virtual tables");
        setLoading(false);
      }
    };

    fetchTables();
  }, [eventId, currentUser]);

  // Handle table selection
  const handleTableSelect = (table: VirtualTable) => {
    setSelectedTable(table);
  };

  // Handle joining a table
  const handleJoinTable = async () => {
    if (!selectedTable || !currentUser) return;

    try {
      // Check if the table is full
      if (
        selectedTable.capacity &&
        selectedTable.participants.length >= selectedTable.capacity
      ) {
        setError("This table is full");
        return;
      }

      // Leave current table if already at one
      if (joinedTable) {
        await updateDoc(doc(firestore, "virtualTables", joinedTable.id), {
          participants: arrayRemove(currentUser.uid),
          updatedAt: serverTimestamp(),
        });
      }

      // Join new table
      await updateDoc(doc(firestore, "virtualTables", selectedTable.id), {
        participants: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      });

      setJoinedTable(selectedTable);
      setSelectedTable(null);
      setShowJitsi(true);
    } catch (error) {
      console.error("Error joining table:", error);
      setError("Failed to join table");
    }
  };

  // Handle leaving a table
  const handleLeaveTable = async () => {
    if (!joinedTable || !currentUser) return;

    try {
      await updateDoc(doc(firestore, "virtualTables", joinedTable.id), {
        participants: arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp(),
      });

      setJoinedTable(null);
      setShowJitsi(false);
    } catch (error) {
      console.error("Error leaving table:", error);
      setError("Failed to leave table");
    }
  };

  // Handle starting a broadcast
  const handleStartBroadcast = () => {
    if (onBroadcastStart) {
      onBroadcastStart();
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // If user is at a table and Jitsi is shown
  if (joinedTable && showJitsi) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6">Table: {joinedTable.name}</Typography>
          <Box>
            {userProfile?.role === "admin" && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartBroadcast}
                sx={{ mr: 1 }}
              >
                Start Broadcast
              </Button>
            )}
            <Button variant="outlined" color="error" onClick={handleLeaveTable}>
              Leave Table
            </Button>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <JitsiContainer
            roomName={`${eventId}-table-${joinedTable.id}`}
            isHost={false}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Virtual Tables</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {isHost && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Table
            </Button>
          )}
          {userProfile?.role === "admin" && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartBroadcast}
            >
              Start Broadcast
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {tables.map((table) => (
          <Box 
            key={table.id} 
            sx={{ 
              width: { xs: "100%", sm: "calc(50% - 16px)", md: "calc(33.333% - 16px)" },
              minWidth: "250px"
            }}
          >
            <Paper
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                height: 200,
                cursor: "pointer",
                borderColor:
                  joinedTable?.id === table.id ? "primary.main" : "divider",
                borderWidth: joinedTable?.id === table.id ? 2 : 1,
                borderStyle: "solid",
                "&:hover": {
                  boxShadow: 3,
                },
              }}
              onClick={() => handleTableSelect(table)}
            >
              <Typography variant="h6" gutterBottom>
                {table.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {table.participants.length}/{table.capacity} participants
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <AvatarGroup max={4}>
                {table.participants.map((userId) => (
                  <Avatar
                    key={userId}
                    alt={users[userId]?.displayName || "User"}
                    src={users[userId]?.photoURL || undefined}
                  >
                    {users[userId]?.displayName?.charAt(0) || "U"}
                  </Avatar>
                ))}
              </AvatarGroup>
              {joinedTable?.id === table.id && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => setShowJitsi(true)}
                >
                  Rejoin Table
                </Button>
              )}
            </Paper>
          </Box>
        ))}
      </Box>

      {/* Table selection dialog */}
      <Dialog open={!!selectedTable} onClose={() => setSelectedTable(null)}>
        <DialogTitle>Join Table</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Would you like to join the table "{selectedTable?.name}"?
          </Typography>
          {selectedTable && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Current participants:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                {selectedTable.participants.map((userId) => (
                  <Chip
                    key={userId}
                    avatar={
                      <Avatar
                        alt={users[userId]?.displayName || "User"}
                        src={users[userId]?.photoURL || undefined}
                      >
                        {users[userId]?.displayName?.charAt(0) || "U"}
                      </Avatar>
                    }
                    label={users[userId]?.displayName || "Unknown User"}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedTable(null)}>Cancel</Button>
          <Button onClick={handleJoinTable} variant="contained" color="primary">
            Join Table
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Table dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Table</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Typography variant="body2">Table Name</Typography>
            <input
              type="text"
              value={newTableName}
              onChange={e => setNewTableName(e.target.value)}
              style={{ padding: 8, fontSize: 16, borderRadius: 4, border: "1px solid #ccc" }}
              placeholder="e.g. Networking Table 1"
              disabled={creatingTable}
            />
            <Typography variant="body2">Capacity</Typography>
            <input
              type="number"
              min={1}
              max={50}
              value={newTableCapacity}
              onChange={e => setNewTableCapacity(Number(e.target.value))}
              style={{ padding: 8, fontSize: 16, borderRadius: 4, border: "1px solid #ccc" }}
              disabled={creatingTable}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creatingTable}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!newTableName.trim() || !eventId) return;
              setCreatingTable(true);
              try {
                const newTable = {
                  eventId,
                  name: newTableName.trim(),
                  capacity: newTableCapacity,
                  participants: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await import("firebase/firestore").then(async ({ addDoc, collection }) => {
                  await addDoc(collection(firestore, "virtualTables"), newTable);
                });
                setNewTableName('');
                setNewTableCapacity(6);
                setCreateDialogOpen(false);
                setCreatingTable(false);
                setLoading(true); // trigger reload
                // Refetch tables
                const tablesQuery = query(
                  collection(firestore, "virtualTables"),
                  where("eventId", "==", eventId)
                );
                const tablesSnapshot = await getDocs(tablesQuery);
                const tablesData = tablesSnapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    ...data,
                    createdAt: convertTimestamp(data.createdAt) || new Date(),
                    updatedAt: convertTimestamp(data.updatedAt) || new Date()
                  } as VirtualTable;
                });
                setTables(tablesData);
                setLoading(false);
              } catch (err) {
                setCreatingTable(false);
                setError("Failed to create table");
              }
            }}
            variant="contained"
            color="primary"
            disabled={creatingTable || !newTableName.trim()}
          >
            {creatingTable ? "Creating..." : "Create Table"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VirtualTables;

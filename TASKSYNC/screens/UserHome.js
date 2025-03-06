import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../utils/firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

const UserHomeScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [additionalTasks, setAdditionalTasks] = useState([]);
  const currentUser = auth.currentUser;

  const scheduleNotification = async (task, interval) => {
    const trigger = new Date(task.deadline);
    trigger.setTime(trigger.getTime() - interval);
    if (trigger > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Task Reminder: ${task.name}`,
          body: `${task.name} is due on ${new Date(task.deadline).toDateString()}`,
        },
        trigger,
      });
    }
  };

  const checkDeadlinesAndLifelines = async (tasks) => {
    const now = new Date();
    for (const task of tasks) {
      if (!task.completed && new Date(task.deadline) < now) {
        // Task is overdue
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        if (userData.lifelines > 0) {
          const newLifelines = userData.lifelines - 1;
          await updateDoc(userDocRef, { lifelines: newLifelines });
          Alert.alert('Warning', `Task "${task.name}" missed! Lifelines left: ${newLifelines}`);
          if (newLifelines === 0) {
            await auth.signOut();
            Alert.alert('Removed', 'You’ve run out of lifelines and have been removed.');
            navigation.replace('Login');
          }
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    });

    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), async (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const userAssigned = allTasks.filter((task) =>
        task.assignedUsers.includes(currentUser.email)
      );
      const availableTasks = allTasks.filter(
        (task) =>
          !task.completed &&
          task.assignedUsers.length < task.maxStudents &&
          !task.assignedUsers.includes(currentUser.email)
      );
      setAssignedTasks(userAssigned);
      setAdditionalTasks(availableTasks);

      // Check deadlines and update lifelines
      await checkDeadlinesAndLifelines(userAssigned);

      // Schedule notifications
      userAssigned.forEach((task) => {
        if (!task.completed) {
          scheduleNotification(task, 7 * 24 * 60 * 60 * 1000);
          scheduleNotification(task, 24 * 60 * 60 * 1000);
          scheduleNotification(task, 60 * 60 * 1000);
        }
      });
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, [currentUser.email, navigation]);

  const handleAssignTask = async (task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const updatedAssignedUsers = [...task.assignedUsers, currentUser.email];
      await updateDoc(taskRef, { assignedUsers: updatedAssignedUsers });
      Alert.alert('Success', 'You have been assigned to the task!');
      scheduleNotification(task, 7 * 24 * 60 * 60 * 1000);
      scheduleNotification(task, 24 * 60 * 60 * 1000);
      scheduleNotification(task, 60 * 60 * 1000);
    } catch (err) {
      console.error('Error assigning task:', err);
      Alert.alert('Error', 'Failed to assign task');
    }
  };

  const renderUser = ({ item }) => (
    <Text style={[styles.userName, item.lifelines < 3 && styles.redMark]}>
      {item.name} {item.lifelines < 3 ? `(${item.lifelines}/3)` : ''}
    </Text>
  );

  const renderAssignedTask = ({ item }) => (
    <View style={styles.taskCard}>
      <Text style={styles.taskTitle}>{item.name}</Text>
      <Text>{item.description}</Text>
      <Text>Deadline: {new Date(item.deadline).toDateString()}</Text>
      <Text>Assigned: {item.assignedUsers.length}/{item.maxStudents}</Text>
    </View>
  );

  const renderAdditionalTask = ({ item }) => (
    <View style={styles.taskCard}>
      <Text style={styles.taskTitle}>{item.name}</Text>
      <Text>{item.description}</Text>
      <Text>Deadline: {new Date(item.deadline).toDateString()}</Text>
      <Text>Assigned: {item.assignedUsers.length}/{item.maxStudents}</Text>
      <Button
        title="Assign Me"
        onPress={() => handleAssignTask(item)}
        disabled={item.assignedUsers.length >= item.maxStudents}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {currentUser.displayName || 'User'}!</Text>
      <Text style={styles.subtitle}>Contributors</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        style={styles.list}
      />
      <Text style={styles.subtitle}>Your Assigned Tasks</Text>
      {assignedTasks.length > 0 ? (
        <FlatList
          data={assignedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignedTask}
          style={styles.list}
        />
      ) : (
        <Text>No assigned tasks yet.</Text>
      )}
      <Text style={styles.subtitle}>Additional Tasks</Text>
      {additionalTasks.length > 0 ? (
        <FlatList
          data={additionalTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderAdditionalTask}
          style={styles.list}
        />
      ) : (
        <Text>No additional tasks available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 20, marginTop: 20, marginBottom: 10 },
  userName: { fontSize: 18, padding: 10 },
  redMark: { color: 'red' },
  taskCard: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  taskTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { maxHeight: '30%' },
});

export default UserHomeScreen;
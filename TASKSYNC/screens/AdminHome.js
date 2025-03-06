import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Platform } from 'react-native';
import { db } from '../utils/firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const AdminHomeScreen = () => {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList.filter((user) => user.lifelines > 0)); // Only show active users
    });

    const unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTasks();
    };
  }, []);

  const handleAddTask = async () => {
    if (!taskName || !taskDesc || !maxStudents || !deadline) {
      alert('Please fill all fields');
      return;
    }
    try {
      await addDoc(collection(db, 'tasks'), {
        name: taskName,
        description: taskDesc,
        maxStudents: parseInt(maxStudents),
        deadline: deadline.toISOString(),
        assignedUsers: [],
        completed: false,
      });
      setTaskName('');
      setTaskDesc('');
      setMaxStudents('');
      setDeadline(new Date());
      alert('Task added successfully');
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Failed to add task');
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || deadline;
    setShowDatePicker(Platform.OS === 'ios');
    setDeadline(currentDate);
  };

  const renderUser = ({ item }) => (
    <Text style={[styles.userName, item.lifelines < 3 && styles.redMark]}>
      {item.name} {item.lifelines < 3 ? `(${item.lifelines}/3)` : ''}
    </Text>
  );

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <Text style={styles.taskTitle}>{item.name}</Text>
      <Text>{item.description}</Text>
      <Text>Deadline: {new Date(item.deadline).toDateString()}</Text>
      <Text>Assigned: {item.assignedUsers.length}/{item.maxStudents}</Text>
      <Text>Status: {item.completed ? 'Completed' : 'Pending'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Add New Task</Text>
      <TextInput
        style={styles.input}
        placeholder="Task Name"
        value={taskName}
        onChangeText={setTaskName}
      />
      <TextInput
        style={styles.input}
        placeholder="Task Description"
        value={taskDesc}
        onChangeText={setTaskDesc}
      />
      <TextInput
        style={styles.input}
        placeholder="Max Students"
        value={maxStudents}
        onChangeText={setMaxStudents}
        keyboardType="numeric"
      />
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Deadline: {deadline.toDateString()}</Text>
        <Button title="Pick Date" onPress={() => setShowDatePicker(true)} />
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={deadline}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
      <Button title="Add Task" onPress={handleAddTask} />
      <Text style={styles.subtitle}>Contributors</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        style={styles.list}
      />
      <Text style={styles.subtitle}>All Tasks</Text>
      {tasks.length > 0 ? (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          style={styles.list}
        />
      ) : (
        <Text>No tasks created yet.</Text>
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
  input: { width: '100%', borderWidth: 1, padding: 10, marginVertical: 5 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  dateLabel: { fontSize: 16, marginRight: 10 },
  taskCard: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  taskTitle: { fontSize: 18, fontWeight: 'bold' },
  list: { maxHeight: '25%' },
});

export default AdminHomeScreen;
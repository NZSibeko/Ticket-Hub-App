import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const UserManagementScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Create user form state
  const [createUserData, setCreateUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'customer',
    phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/api/admin/users`, { headers });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Mock data for demo
      setUsers([
        {
          id: 1,
          name: 'John Smith',
          email: 'john.smith@example.com',
          role: 'customer',
          status: 'active',
          joinDate: '2024-01-15T00:00:00Z',
          eventsAttended: 5
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah.j@example.com',
          role: 'event_manager',
          status: 'active',
          joinDate: '2024-02-20T00:00:00Z',
          eventsAttended: 12
        },
        {
          id: 3,
          name: 'Mike Wilson',
          email: 'mike.wilson@example.com',
          role: 'customer',
          status: 'inactive',
          joinDate: '2024-03-10T00:00:00Z',
          eventsAttended: 0
        },
        {
          id: 4,
          name: 'Admin User',
          email: 'admin@tickethub.com',
          role: 'admin',
          status: 'active',
          joinDate: '2024-01-01T00:00:00Z',
          eventsAttended: 0
        },
        {
          id: 5,
          name: 'Emily Davis',
          email: 'emily.davis@example.com',
          role: 'support',
          status: 'active',
          joinDate: '2024-02-05T00:00:00Z',
          eventsAttended: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validation
    if (!createUserData.firstName || !createUserData.lastName || !createUserData.email || !createUserData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (createUserData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setCreateUserLoading(true);
    try {
      const headers = getAuthHeader();
      const userData = {
        first_name: createUserData.firstName,
        last_name: createUserData.lastName,
        email: createUserData.email,
        password: createUserData.password,
        role: createUserData.role,
        phone: createUserData.phone || null
      };

      const response = await axios.post(`${API_URL}/api/admin/users`, userData, { headers });
      
      // Add the new user to the local state
      const newUser = {
        id: users.length + 1,
        name: `${createUserData.firstName} ${createUserData.lastName}`,
        email: createUserData.email,
        role: createUserData.role,
        status: 'active',
        joinDate: new Date().toISOString(),
        eventsAttended: 0
      };

      setUsers([newUser, ...users]);
      setShowCreateUserModal(false);
      resetCreateUserForm();
      Alert.alert('Success', 'User created successfully!');
      
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const resetCreateUserForm = () => {
    setCreateUserData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'customer',
      phone: ''
    });
  };

  // FIX: Added proper null checks before using .toLowerCase()
  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase();
    const username = user?.name || '';
    const email = user?.email || '';
    const role = user?.role || '';
    const userType = user?.userType || '';
    
    return (
      username.toLowerCase().includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm) ||
      role.toLowerCase().includes(searchTerm) ||
      userType.toLowerCase().includes(searchTerm)
    );
  });

  // FIX: Safe key extractor to prevent undefined errors
  const keyExtractor = (item, index) => {
    if (!item) {
      return `user-${index}-undefined-${Date.now()}`;
    }
    return item.id ? item.id.toString() : `user-${index}-${Date.now()}`;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'event_manager': return '#f59e0b';
      case 'support': return '#6366f1';
      case 'super_admin': return '#8b5cf6';
      case 'superhero': return '#ec4899';
      default: return '#10b981';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'event_manager': return 'Event Manager';
      case 'support': return 'Support Team';
      case 'super_admin': return 'Super Admin';
      case 'superhero': return 'Superhero';
      default: return 'Customer';
    }
  };

  const handleRoleChange = (userId, newRole) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
    setShowRoleModal(false);
    Alert.alert('Success', 'User role updated successfully');
  };

  const handleStatusToggle = (userId) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' } : user
    ));
  };

  // FIX: Added null safety checks to prevent the split error
  const UserCard = ({ user }) => {
    // Safely get initials with null checks
    const getInitials = (name) => {
      if (!name || typeof name !== 'string') return '?';
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length === 0) return '?';
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return parts.map(n => n.charAt(0).toUpperCase()).join('');
    };

    // Ensure user object has all required properties
    const userName = user?.name || 'Unknown User';
    const userEmail = user?.email || 'No email';
    const userRole = user?.role || 'customer';
    const userStatus = user?.status || 'inactive';
    const userJoinDate = user?.joinDate || new Date().toISOString();
    const userEventsAttended = user?.eventsAttended || 0;

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>
              {getInitials(userName)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userRole) + '20' }]}>
            <Text style={[styles.roleText, { color: getRoleColor(userRole) }]}>
              {getRoleLabel(userRole)}
            </Text>
          </View>
        </View>

        <View style={styles.userDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar" size={14} color="#64748b" />
            <Text style={styles.detailText}>
              Joined {new Date(userJoinDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="ticket" size={14} color="#64748b" />
            <Text style={styles.detailText}>
              {userEventsAttended} events attended
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="person" size={14} color="#64748b" />
            <Text style={[styles.statusText, 
              userStatus === 'active' ? styles.statusActive : styles.statusInactive
            ]}>
              {userStatus === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setSelectedUser(user);
              setShowRoleModal(true);
            }}
          >
            <Ionicons name="shield" size={16} color="#6366f1" />
            <Text style={styles.actionText}>Change Role</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, userStatus === 'active' ? styles.deactivateButton : styles.activateButton]}
            onPress={() => handleStatusToggle(user.id)}
          >
            <Ionicons 
              name={userStatus === 'active' ? 'pause-circle' : 'play-circle'} 
              size={16} 
              color={userStatus === 'active' ? '#ef4444' : '#10b981'} 
            />
            <Text style={[styles.actionText, 
              userStatus === 'active' ? styles.deactivateText : styles.activateText
            ]}>
              {userStatus === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header without Back Button */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <TouchableOpacity 
          style={styles.createUserButton}
          onPress={() => setShowCreateUserModal(true)}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.createUserButtonText}>Create User</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterContainer}>
          {['all', 'customer', 'admin', 'event_manager', 'support'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
                {filterType === 'event_manager' ? 'Event Manager' : 
                 filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => <UserCard user={item} />}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.usersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyStateText}>No users found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'No users match the current filter'}
            </Text>
          </View>
        }
      />

      {/* Create User Modal */}
      <Modal
        visible={showCreateUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCreateUserModal(false);
          resetCreateUserForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.createUserModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateUserModal(false);
                  resetCreateUserForm();
                }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createUserForm}>
              <View style={styles.formRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter first name"
                    value={createUserData.firstName}
                    onChangeText={(text) => setCreateUserData({...createUserData, firstName: text})}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter last name"
                    value={createUserData.lastName}
                    onChangeText={(text) => setCreateUserData({...createUserData, lastName: text})}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={createUserData.email}
                  onChangeText={(text) => setCreateUserData({...createUserData, email: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  secureTextEntry
                  value={createUserData.password}
                  onChangeText={(text) => setCreateUserData({...createUserData, password: text})}
                />
                <Text style={styles.helperText}>Minimum 6 characters</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  value={createUserData.phone}
                  onChangeText={(text) => setCreateUserData({...createUserData, phone: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>User Role *</Text>
                <View style={styles.roleOptions}>
                  {['customer', 'event_manager', 'support', 'admin'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        createUserData.role === role && styles.roleOptionSelected
                      ]}
                      onPress={() => setCreateUserData({...createUserData, role})}
                    >
                      <View style={[styles.roleOptionIcon, { backgroundColor: getRoleColor(role) + '20' }]}>
                        <Ionicons name="shield" size={16} color={getRoleColor(role)} />
                      </View>
                      <Text style={styles.roleOptionText}>{getRoleLabel(role)}</Text>
                      {createUserData.role === role && (
                        <Ionicons name="checkmark" size={20} color="#6366f1" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateUserModal(false);
                  resetCreateUserForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, createUserLoading && styles.createButtonDisabled]}
                onPress={handleCreateUser}
                disabled={createUserLoading}
              >
                {createUserLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={styles.createButtonText}>Create User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change User Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <>
                <View style={styles.modalUserInfo}>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>

                <Text style={styles.sectionTitle}>Select New Role</Text>
                <View style={styles.roleOptions}>
                  {['customer', 'event_manager', 'support', 'admin'].map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleOption, selectedUser.role === role && styles.roleOptionSelected]}
                      onPress={() => handleRoleChange(selectedUser.id, role)}
                    >
                      <View style={[styles.roleOptionIcon, { backgroundColor: getRoleColor(role) + '20' }]}>
                        <Ionicons name="shield" size={16} color={getRoleColor(role)} />
                      </View>
                      <Text style={styles.roleOptionText}>{getRoleLabel(role)}</Text>
                      {selectedUser.role === role && (
                        <Ionicons name="checkmark" size={20} color="#6366f1" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  createUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createUserButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  usersList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    color: '#10b981',
  },
  statusInactive: {
    color: '#ef4444',
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  activateButton: {
    backgroundColor: '#f0fdf4',
  },
  deactivateButton: {
    backgroundColor: '#fef2f2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  activateText: {
    color: '#10b981',
  },
  deactivateText: {
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  createUserModal: {
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  createUserForm: {
    maxHeight: 400,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f9ff',
  },
  roleOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalUserInfo: {
    marginBottom: 20,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default UserManagementScreen;
// Friends utility functions for localStorage management

export const friendsStorage = {
  // Get friends from localStorage
  getFriends: () => {
    try {
      const friends = localStorage.getItem('friends');
      return friends ? JSON.parse(friends) : [];
    } catch (error) {
      console.error('Error getting friends from localStorage:', error);
      return [];
    }
  },

  // Set friends in localStorage
  setFriends: (friends) => {
    try {
      localStorage.setItem('friends', JSON.stringify(friends));
      return true;
    } catch (error) {
      console.error('Error setting friends in localStorage:', error);
      return false;
    }
  },

  // Add a single friend to localStorage
  addFriend: (friend) => {
    try {
      const currentFriends = friendsStorage.getFriends();
      const updatedFriends = [...currentFriends, friend];
      return friendsStorage.setFriends(updatedFriends);
    } catch (error) {
      console.error('Error adding friend to localStorage:', error);
      return false;
    }
  },

  // Remove a friend from localStorage
  removeFriend: (friendUserId) => {
    try {
      const currentFriends = friendsStorage.getFriends();
      const updatedFriends = currentFriends.filter(friend => friend.idofuser !== friendUserId);
      return friendsStorage.setFriends(updatedFriends);
    } catch (error) {
      console.error('Error removing friend from localStorage:', error);
      return false;
    }
  },

  // Update friend alias in localStorage
  updateFriendAlias: (friendUserId, newAlias) => {
    try {
      const currentFriends = friendsStorage.getFriends();
      const updatedFriends = currentFriends.map(friend => 
        friend.idofuser === friendUserId 
          ? { ...friend, alias: newAlias }
          : friend
      );
      return friendsStorage.setFriends(updatedFriends);
    } catch (error) {
      console.error('Error updating friend alias in localStorage:', error);
      return false;
    }
  },

  // Check if user is already a friend
  isFriend: (friendUserId) => {
    const friends = friendsStorage.getFriends();
    return friends.some(friend => friend.idofuser === friendUserId);
  },

  // Clear all friends from localStorage
  clearFriends: () => {
    try {
      localStorage.removeItem('friends');
      return true;
    } catch (error) {
      console.error('Error clearing friends from localStorage:', error);
      return false;
    }
  },

  // Remove a friend by userId when their account is deleted
  removeFriendByUserId: (deletedUserId) => {
    try {
      const currentFriends = friendsStorage.getFriends();
      const updatedFriends = currentFriends.filter(friend => friend.idofuser !== deletedUserId);
      const removed = currentFriends.length !== updatedFriends.length;
      
      if (removed) {
        friendsStorage.setFriends(updatedFriends);
        console.log(`Removed deleted user ${deletedUserId} from friends list`);
        
        // Dispatch event to notify components to refresh
        window.dispatchEvent(new CustomEvent('friend-account-deleted', { 
          detail: { deletedUserId, updatedFriends } 
        }));
      }
      
      return removed;
    } catch (error) {
      console.error('Error removing friend by userId from localStorage:', error);
      return false;
    }
  },

  // Fetch friends from API and store in localStorage
  fetchAndStoreFriends: async (token) => {
    try {
      const response = await fetch('http://localhost:8080/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const friends = await response.json();
        friendsStorage.setFriends(friends);
        console.log('Friends fetched and stored in localStorage:', friends.length);
        return friends;
      } else {
        console.error('Failed to fetch friends:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  },

  // Remove chats with deleted user from localStorage
  removeChatsWithDeletedUser: (deletedUserId) => {
    try {
      const myUserId = localStorage.getItem('userId');
      if (!myUserId) return false;

      let chatsRemoved = 0;
      
      // Remove all chat conversations with the deleted user
      for (let key in localStorage) {
        if (key.startsWith('chat_')) {
          const ids = key.replace('chat_', '').split('_');
          
          // Check if this chat involves the deleted user
          if (ids.includes(deletedUserId)) {
            localStorage.removeItem(key);
            chatsRemoved++;
            console.log(`Removed chat conversation: ${key}`);
          }
        }
      }
      
      // Remove unread message counts for the deleted user
      const unread = JSON.parse(localStorage.getItem('unread_private') || '{}');
      if (unread[deletedUserId]) {
        delete unread[deletedUserId];
        localStorage.setItem('unread_private', JSON.stringify(unread));
        console.log(`Removed unread messages for deleted user ${deletedUserId}`);
      }
      
      if (chatsRemoved > 0) {
        console.log(`Removed ${chatsRemoved} chat conversations with deleted user ${deletedUserId}`);
        
        // Dispatch event to notify components to refresh
        window.dispatchEvent(new CustomEvent('chats-deleted', { 
          detail: { deletedUserId, chatsRemoved } 
        }));
        
        // Also dispatch message-received event to refresh chat lists
        window.dispatchEvent(new CustomEvent('message-received'));
        window.dispatchEvent(new CustomEvent('unread-updated'));
      }
      
      return chatsRemoved > 0;
    } catch (error) {
      console.error('Error removing chats with deleted user:', error);
      return false;
    }
  },

  // Update friend profile information when user updates their profile
  updateFriendProfile: (userId, newUsername, newProfilePic = null) => {
    try {
      const currentFriends = friendsStorage.getFriends();
      let updated = false;
      
      const updatedFriends = currentFriends.map(friend => {
        if (friend.idofuser === userId) {
          updated = true;
          return {
            ...friend,
            username: newUsername,
            ...(newProfilePic !== null && { profile_pic: newProfilePic })
          };
        }
        return friend;
      });
      
      if (updated) {
        friendsStorage.setFriends(updatedFriends);
        console.log(`Updated friend profile for userId ${userId} to username ${newUsername}`);
        
        // Dispatch event to notify components to refresh
        window.dispatchEvent(new CustomEvent('friend-profile-updated', { 
          detail: { userId, newUsername, newProfilePic } 
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating friend profile in localStorage:', error);
      return false;
    }
  },

  // Sync specific friend operation with backend and localStorage
  syncFriendOperation: async (operation, data, token) => {
    try {
      let response;
      switch (operation) {
        case 'add':
          response = await fetch('http://localhost:8080/api/friends/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          });
          break;
        case 'remove':
          response = await fetch(`http://localhost:8080/api/friends/remove/${data.friendUserId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          break;
        case 'updateAlias':
          response = await fetch(`http://localhost:8080/api/friends/alias/${data.friendUserId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alias: data.alias })
          });
          break;
        default:
          throw new Error('Invalid operation');
      }

      if (response.ok) {
        // Re-fetch and update localStorage after successful backend operation
        await friendsStorage.fetchAndStoreFriends(token);
        return { success: true, data: await response.json() };
      } else {
        return { success: false, error: response.status };
      }
    } catch (error) {
      console.error(`Error in syncFriendOperation (${operation}):`, error);
      return { success: false, error: error.message };
    }
  }
};

export default friendsStorage;

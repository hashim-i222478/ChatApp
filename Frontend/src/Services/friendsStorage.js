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
  }
};

export default friendsStorage;

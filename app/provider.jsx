"use client"
import { useUser } from '@clerk/nextjs'
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { UserDetailContext } from './_context/UserDetailContext';

function Provider({ children }) {
  const { user } = useUser();
  const [userDetail, setUserDetail] = useState([]);

  useEffect(() => {
    if (user) VerifyUser();
  }, [user]);

  const VerifyUser = async () => {
    try {
      const dataResult = await axios.post('/api/verify-user', {
        user: user
      });
      setUserDetail(dataResult.data.result);
    } catch (err) {
      console.error("Error verifying user:", err);
    }
  };

  return (
    <UserDetailContext.Provider value={{ user, userDetail, setUserDetail }}>
      {children}
    </UserDetailContext.Provider>
  )
}

export default Provider;

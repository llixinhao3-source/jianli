import React, { createContext, useContext, useState, useCallback } from 'react';

const initialState = {
  learnedChapters: [],
  passedSocraticQuestions: [],
  mockInterviewScore: null,
  mockInterviewHighlights: ""
};

const CareerContext = createContext(null);

export function CareerProvider({ children }) {
  const [careerState, setCareerState] = useState(initialState);

  const addLearnedChapter = useCallback((chapterName) => {
    setCareerState(prev => {
      if (prev.learnedChapters.includes(chapterName)) return prev;
      return {
        ...prev,
        learnedChapters: [...prev.learnedChapters, chapterName]
      };
    });
  }, []);

  const addPassedSocraticQuestion = useCallback((question, answer, score) => {
    setCareerState(prev => ({
      ...prev,
      passedSocraticQuestions: [
        ...prev.passedSocraticQuestions,
        { question, answer, score, timestamp: new Date().toISOString() }
      ]
    }));
  }, []);

  const setMockInterviewResult = useCallback((score, highlights) => {
    setCareerState(prev => ({
      ...prev,
      mockInterviewScore: score,
      mockInterviewHighlights: highlights
    }));
  }, []);

  const isChapterLearned = useCallback((chapterName) => {
    return careerState.learnedChapters.includes(chapterName);
  }, [careerState.learnedChapters]);

  return (
    <CareerContext.Provider value={{
      careerState,
      addLearnedChapter,
      addPassedSocraticQuestion,
      setMockInterviewResult,
      isChapterLearned
    }}>
      {children}
    </CareerContext.Provider>
  );
}

export function useCareer() {
  const context = useContext(CareerContext);
  if (!context) {
    throw new Error('useCareer must be used within CareerProvider');
  }
  return context;
}

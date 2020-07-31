import os, pickle, time, math, pdb
from box import Box
import numpy as np
import keras
import tensorflow as tf
from keras import backend as K
from keras.layers import Layer, Input, Dense
from keras.models import Model, load_model
from keras.callbacks import EarlyStopping
from keras.optimizers import Adam, SGD
from sklearn.model_selection import train_test_split
from scipy.spatial.distance import cdist
from kneed import KneeLocator

# umap needs https://github.com/lmcinnes/umap/issues/416
import n2d


# https://mc.ai/a-beginners-guide-to-build-stacked-autoencoder-and-tying-weights-with-it/
class DenseTied(Layer):
    def __init__(self, dense, activation=None, **kwargs):
        self.dense = dense
        self.activation = keras.activations.get(activation)
        super().__init__(**kwargs)

    def build(self, batch_input_shape):
        self.biases = self.add_weight(name="bias", initializer="zeros", shape=[self.dense.input_shape[-1]])
        super().build(batch_input_shape)

    def call(self, inputs):
        z = tf.matmul(inputs, self.dense.weights[0], transpose_b=True)
        return self.activation(z + self.biases)


class AutoEncoder():
    model_path = 'tmp/custom_ae.tf'

    def __init__(self):
        K.clear_session()
        self.Model, self.encoder = self.model()

    def model(self):
        # See https://github.com/maxfrenzel/CompressionVAE/blob/master/cvae/cvae.py
        # More complex boilerplate https://towardsdatascience.com/build-the-right-autoencoder-tune-and-optimize-using-pca-principles-part-ii-24b9cca69bd6
        # it likes [512, 512] -> 64 (for 768->32)
        layers = [
            # (500, 'relu'),
            (500, 'relu'),
            (64, 'relu')  # linear
        ]
        denses = [Dense(l[0], activation=l[1]) for l in layers]
        encos, decos = [], []
        input = Input(shape=(768,))
        for i, d in enumerate(denses):
            prev = input if i == 0 else encos[-1]
            encos.append(d(prev))
        for i, d in enumerate(denses[::-1]):
            mirror = -(i+1)
            # act = 'linear' if i == len(layers)-1 else layers[mirror][1]
            act = layers[mirror][1]
            deco = encos[-1] if i == 0 else decos[-1]
            deco = DenseTied(d, activation=act)(deco)
            decos.append(deco)

        ae = Model(input, decos[-1])
        encoder = Model(input, encos[-1])

        adam = Adam(learning_rate=1e-3)
        ae.compile(metrics=['accuracy'], optimizer=adam, loss='mse')
        #ae.summary()
        return ae, encoder

    def fit(self,
            x,
            batch_size=None,
            epochs=None,
            loss=None,
            optimizer=None,
            weights=None,
            verbose=None,
            weight_id=None,
            patience=None,
    ):
        x_train, x_test = train_test_split(x, shuffle=True)
        es = EarlyStopping(monitor='val_loss', mode='min', patience=4, min_delta=.001)
        self.Model.fit(
            x_train, x_train,
            epochs=50,
            batch_size=256,
            shuffle=True,
            callbacks=[es],
            validation_data=(x_test, x_test)
        )
        # model.save() giving me trouble. just use pickle for now
        self.Model.save_weights(self.model_path)

    def load(self):
        self.Model.load_weights(self.model_path)


class Clusterer():
    manifold_path = "tmp/n2d_manifold"

    def __init__(self, n_clusters=30, load=True):
        self.n_clusters = n_clusters
        self.loaded = False
        if load and\
            os.path.exists(AutoEncoder.model_path + ".index") and\
            os.path.exists(Clusterer.manifold_path):
            self.model = self.load()
            self.loaded = True
        else:
            self.model = self.init_model()

    def init_model(self):
        ae = AutoEncoder()
        manifold_clusterer = n2d.UmapGMM(
            self.n_clusters,
            umap_dim=5,
            umap_neighbors=20
        )
        return n2d.n2d(ae, manifold_clusterer)

    def fit(self, x):
        self.model.fit(x)
        with open(Clusterer.manifold_path, "wb") as f:
            pickle.dump(self.model.manifold_learner, f)

    def load(self):
        ae = AutoEncoder()
        ae.load()
        with open(Clusterer.manifold_path, "rb") as f:
            man = pickle.load(f)
        return n2d.n2d(ae, man)

    def encode(self, X):
        return self.model.encoder.predict(X)

    def cluster(self, X):
        return self.model.predict(X)


def hypersearch_n_clusters(X):
    # Code from https://github.com/arvkevi/kneed/blob/master/notebooks/decreasing_function_walkthrough.ipynb
    guess = Box(min=14, max=100, good=30)
    step = 3
    K = list(range(guess.min, guess.max, step))
    ks, bics = [], []
    for k in K:
        c = Clusterer(k, load=False)
        c.fit(X)
        umapgmm = c.model.manifold_learner
        gmm = umapgmm.cluster_manifold
        bics.append(gmm.bic(umapgmm.hle)/X.shape[0])
        print("bics")
        ks.append(k)
        print("\n\n")
        print(list(zip(ks, bics)))
        print("\n\n")
    kn = KneeLocator(K, bics, S=1.5, curve='convex', direction='decreasing', interp_method='interp1d')
    print('knee', kn.knee)
    return kn.knee or guess.good
